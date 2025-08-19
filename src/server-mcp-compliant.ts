import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  InitializeRequestSchema,
  PingRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  CallToolResultSchema,
  ToolSchema,
  ErrorCode,
  McpError,
  LATEST_PROTOCOL_VERSION,
  type CallToolResult,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { appConfig } from './utils/config.js';
import { SonicWallApiClient } from './sonicwall/api-client.js';
import { analyzeLogs } from './tools/analyze.js';
import { getThreats } from './tools/threats.js';
import { searchConnections } from './tools/search.js';
import { getStats } from './tools/stats.js';
import { exportLogs } from './tools/export.js';

// Configure logging
const logger = winston.createLogger({
  level: appConfig.server.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sonicwall-mcp-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

class SonicWallMCPServer {
  private app: express.Application;
  private mcpServer!: Server;
  private sonicwallClient!: SonicWallApiClient;
  private transport!: SSEServerTransport;
  private ajv: Ajv;
  private serverCapabilities = {
    tools: {},
    resources: {},
    prompts: {},
    logging: {}
  };

  constructor() {
    this.app = express();
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.setupExpress();
    this.setupSonicWallClient();
    this.setupMCPServer();
  }

  private setupExpress(): void {
    // Enhanced security headers per MCP spec
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));
    
    // CORS configuration per MCP spec - validate Origin header
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow localhost for development and testing per MCP spec
        const allowedOrigins = [
          'http://localhost:3000',
          'https://localhost:3000',
          'http://127.0.0.1:3000',
          'https://127.0.0.1:3000',
          // Add Claude Desktop origin
          'https://claude.ai',
          'https://www.claude.ai'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          logger.warn(`Blocked CORS request from origin: ${origin}`);
          return callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'X-Requested-With']
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        protocol: `MCP/${LATEST_PROTOCOL_VERSION}`,
        capabilities: Object.keys(this.serverCapabilities),
      });
    });

    // Basic auth middleware for MCP endpoints if token is configured
    if (appConfig.auth?.bearerToken) {
      this.app.use('/mcp', (req, res, next) => {
        const authHeader = req.headers.authorization;
        const expectedToken = `Bearer ${appConfig.auth!.bearerToken}`;
        
        if (!authHeader || authHeader !== expectedToken) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        return next();
      });
    }
  }

  private setupSonicWallClient(): void {
    this.sonicwallClient = new SonicWallApiClient(
      appConfig.sonicwall.host,
      appConfig.sonicwall.username,
      appConfig.sonicwall.password,
      appConfig.sonicwall.version
    );

    logger.info('SonicWall API client initialized', {
      host: appConfig.sonicwall.host,
      version: appConfig.sonicwall.version,
    });
  }

  private setupMCPServer(): void {
    this.mcpServer = new Server(
      {
        name: 'sonicwall-analyzer',
        version: '1.0.0',
        description: 'SonicWall firewall log analysis and threat detection server'
      },
      {
        capabilities: this.serverCapabilities
      }
    );

    // Set up SSE transport with proper configuration
    this.transport = new SSEServerTransport('/mcp/v1/sse', this.app as any);

    // Register all MCP handlers
    this.registerMCPHandlers();

    // Connect server to transport
    this.mcpServer.connect(this.transport);

    logger.info('MCP server initialized with SSE transport and full protocol compliance');
  }

  private registerMCPHandlers(): void {
    // Initialize request handler - Required for MCP compliance
    this.mcpServer.setRequestHandler(InitializeRequestSchema, async (request) => {
      logger.info('MCP client connected', { 
        clientInfo: request.params.clientInfo,
        protocolVersion: request.params.protocolVersion 
      });
      
      return {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: this.serverCapabilities,
        serverInfo: {
          name: 'sonicwall-analyzer',
          version: '1.0.0',
          description: 'SonicWall firewall log analysis and threat detection server'
        }
      };
    });

    // Ping handler - Required for MCP compliance
    this.mcpServer.setRequestHandler(PingRequestSchema, async () => {
      return {};
    });

    // List resources handler - Required even if empty
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: [] };
    });

    // List prompts handler - Required even if empty
    this.mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: [] };
    });

    // Register tool handlers
    this.registerToolHandlers();
  }

  private registerToolHandlers(): void {
    // List available tools with comprehensive schemas
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'analyze_logs',
          description: 'Analyze SonicWall logs using natural language queries with intelligent pattern matching and security insights',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Natural language query to analyze logs (e.g., "show blocked connections from last hour", "find critical threats", "analyze VPN failures")',
                minLength: 3,
                maxLength: 500
              },
              hoursBack: {
                type: 'number',
                description: 'Number of hours to look back (default: 24)',
                minimum: 1,
                maximum: 168,
                default: 24
              },
              logType: {
                type: 'string',
                enum: ['firewall', 'vpn', 'ips', 'antivirus', 'system', 'all'],
                description: 'Type of logs to analyze (default: all)',
                default: 'all'
              }
            },
            required: ['query'],
            additionalProperties: false
          }
        },
        {
          name: 'get_threats',
          description: 'Retrieve current security threats from SonicWall with detailed analysis and recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              severity: {
                type: 'string',
                enum: ['critical', 'high', 'medium', 'low', 'all'],
                description: 'Filter by threat severity level',
                default: 'all'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of threats to return (default: 50)',
                minimum: 1,
                maximum: 1000,
                default: 50
              },
              includeBlocked: {
                type: 'boolean',
                description: 'Include blocked threats in results (default: true)',
                default: true
              }
            },
            additionalProperties: false
          }
        },
        {
          name: 'search_connections',
          description: 'Search and analyze network connections by IP address, port, or action with security insights',
          inputSchema: {
            type: 'object',
            properties: {
              sourceIp: {
                type: 'string',
                description: 'Source IP address to search for (IPv4 format)',
                pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
              },
              destIp: {
                type: 'string',
                description: 'Destination IP address to search for (IPv4 format)',
                pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
              },
              port: {
                type: 'number',
                description: 'Port number to search for',
                minimum: 1,
                maximum: 65535
              },
              action: {
                type: 'string',
                enum: ['allow', 'deny', 'drop', 'reset', 'all'],
                description: 'Filter by connection action',
                default: 'all'
              },
              hoursBack: {
                type: 'number',
                description: 'Number of hours to look back (default: 24)',
                minimum: 1,
                maximum: 168,
                default: 24
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 100)',
                minimum: 1,
                maximum: 5000,
                default: 100
              }
            },
            additionalProperties: false
          }
        },
        {
          name: 'get_stats',
          description: 'Retrieve comprehensive network statistics, summaries, and security metrics with actionable insights',
          inputSchema: {
            type: 'object',
            properties: {
              metric: {
                type: 'string',
                enum: ['top_blocked_ips', 'top_allowed_ips', 'port_summary', 'threat_summary', 'protocol_breakdown', 'hourly_traffic'],
                description: 'Type of statistics to retrieve'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10)',
                minimum: 1,
                maximum: 100,
                default: 10
              },
              hoursBack: {
                type: 'number',
                description: 'Number of hours to analyze (default: 24)',
                minimum: 1,
                maximum: 168,
                default: 24
              }
            },
            required: ['metric'],
            additionalProperties: false
          }
        },
        {
          name: 'export_logs',
          description: 'Export filtered SonicWall logs in multiple formats with comprehensive metadata and validation',
          inputSchema: {
            type: 'object',
            properties: {
              format: {
                type: 'string',
                enum: ['json', 'csv'],
                description: 'Export format (JSON for detailed analysis, CSV for spreadsheet compatibility)'
              },
              filters: {
                type: 'object',
                properties: {
                  startTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Start time (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)'
                  },
                  endTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'End time (ISO 8601 format, e.g., 2024-01-02T00:00:00Z)'
                  },
                  severity: {
                    type: 'array',
                    items: { 
                      type: 'string',
                      enum: ['critical', 'high', 'medium', 'low', 'info']
                    },
                    description: 'Array of severity levels to include',
                    minItems: 1,
                    maxItems: 5
                  },
                  logType: {
                    type: 'string',
                    enum: ['firewall', 'vpn', 'ips', 'antivirus', 'system', 'all'],
                    description: 'Type of logs to export',
                    default: 'all'
                  },
                  sourceIp: {
                    type: 'string',
                    pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
                    description: 'Filter by source IP address'
                  },
                  destIp: {
                    type: 'string', 
                    pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
                    description: 'Filter by destination IP address'
                  },
                  action: {
                    type: 'string',
                    enum: ['allow', 'deny', 'drop', 'reset', 'all'],
                    description: 'Filter by connection action',
                    default: 'all'
                  }
                },
                additionalProperties: false
              },
              limit: {
                type: 'number',
                description: 'Maximum number of log entries to export (default: 10000, max: 100000)',
                minimum: 1,
                maximum: 100000,
                default: 10000
              }
            },
            required: ['format'],
            additionalProperties: false
          }
        }
      ];
      
      return { tools };
    });

    // Handle tool calls with comprehensive validation and error handling
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Validate tool exists
        const tools = await this.getAvailableTools();
        const tool = tools.find(t => t.name === name);
        if (!tool) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        // Validate input arguments against schema
        if (tool.inputSchema) {
          const validate = this.ajv.compile(tool.inputSchema);
          if (!validate(args)) {
            const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ') || 'Validation failed';
            throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${errors}`);
          }
        }

        let result: any;
        const startTime = Date.now();

        // Execute the appropriate tool with proper type handling
        switch (name) {
          case 'analyze_logs':
            result = await analyzeLogs(this.sonicwallClient, args as any);
            break;
          case 'get_threats':
            result = await getThreats(this.sonicwallClient, args as any);
            break;
          case 'search_connections':
            result = await searchConnections(this.sonicwallClient, args as any);
            break;
          case 'get_stats':
            result = await getStats(this.sonicwallClient, args as any);
            break;
          case 'export_logs':
            result = await exportLogs(this.sonicwallClient, args as any);
            break;
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        const executionTime = Date.now() - startTime;
        logger.info(`Tool ${name} executed successfully`, { 
          executionTime, 
          resultSize: JSON.stringify(result).length 
        });

        // Format result according to MCP spec
        const toolResult: CallToolResult = {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ],
          isError: false
        };

        return toolResult;
      } catch (error) {
        logger.error(`Tool ${name} failed:`, { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          args 
        });
        
        // Return proper MCP error response
        if (error instanceof McpError) {
          throw error;
        }

        const errorResult: CallToolResult = {
          content: [
            {
              type: 'text',
              text: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
            }
          ],
          isError: true
        };

        return errorResult;
      }
    });
  }

  private async getAvailableTools(): Promise<Tool[]> {
    // This should match the tools returned by ListToolsRequestSchema handler
    return [
      {
        name: 'analyze_logs',
        description: 'Analyze SonicWall logs using natural language queries with intelligent pattern matching and security insights',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 3, maxLength: 500 },
            hoursBack: { type: 'number', minimum: 1, maximum: 168, default: 24 },
            logType: { type: 'string', enum: ['firewall', 'vpn', 'ips', 'antivirus', 'system', 'all'], default: 'all' }
          },
          required: ['query'],
          additionalProperties: false
        }
      },
      {
        name: 'get_threats', 
        description: 'Retrieve current security threats from SonicWall with detailed analysis and recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'all'], default: 'all' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 50 },
            includeBlocked: { type: 'boolean', default: true }
          },
          additionalProperties: false
        }
      },
      {
        name: 'search_connections',
        description: 'Search and analyze network connections by IP address, port, or action with security insights',
        inputSchema: {
          type: 'object', 
          properties: {
            sourceIp: { type: 'string', pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$' },
            destIp: { type: 'string', pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$' },
            port: { type: 'number', minimum: 1, maximum: 65535 },
            action: { type: 'string', enum: ['allow', 'deny', 'drop', 'reset', 'all'], default: 'all' },
            hoursBack: { type: 'number', minimum: 1, maximum: 168, default: 24 },
            limit: { type: 'number', minimum: 1, maximum: 5000, default: 100 }
          },
          additionalProperties: false
        }
      },
      {
        name: 'get_stats',
        description: 'Retrieve comprehensive network statistics, summaries, and security metrics with actionable insights',
        inputSchema: {
          type: 'object',
          properties: {
            metric: { type: 'string', enum: ['top_blocked_ips', 'top_allowed_ips', 'port_summary', 'threat_summary', 'protocol_breakdown', 'hourly_traffic'] },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            hoursBack: { type: 'number', minimum: 1, maximum: 168, default: 24 }
          },
          required: ['metric'],
          additionalProperties: false
        }
      },
      {
        name: 'export_logs',
        description: 'Export filtered SonicWall logs in multiple formats with comprehensive metadata and validation',
        inputSchema: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['json', 'csv'] },
            filters: {
              type: 'object',
              properties: {
                startTime: { type: 'string', format: 'date-time' },
                endTime: { type: 'string', format: 'date-time' },
                severity: { type: 'array', items: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] }, minItems: 1, maxItems: 5 },
                logType: { type: 'string', enum: ['firewall', 'vpn', 'ips', 'antivirus', 'system', 'all'], default: 'all' },
                sourceIp: { type: 'string', pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$' },
                destIp: { type: 'string', pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$' },
                action: { type: 'string', enum: ['allow', 'deny', 'drop', 'reset', 'all'], default: 'all' }
              },
              additionalProperties: false
            },
            limit: { type: 'number', minimum: 1, maximum: 100000, default: 10000 }
          },
          required: ['format'],
          additionalProperties: false
        }
      }
    ];
  }

  async start(): Promise<void> {
    try {
      // Test SonicWall connection
      await this.sonicwallClient.authenticate();
      logger.info('Successfully authenticated with SonicWall');

      // Start Express server  
      const server = this.app.listen(appConfig.server.port, '127.0.0.1', () => {
        logger.info(`SonicWall MCP Server started on port ${appConfig.server.port}`);
        logger.info(`Health check available at http://localhost:${appConfig.server.port}/health`);
        logger.info(`MCP SSE endpoint available at http://localhost:${appConfig.server.port}/mcp/v1/sse`);
        logger.info('Server is MCP 2024-11-05 protocol compliant');
      });

      // Handle server errors
      server.on('error', (error) => {
        logger.error('Express server error:', error);
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down SonicWall MCP Server...');
    
    try {
      if (this.transport) {
        await this.transport.close();
      }
      logger.info('MCP transport closed successfully');
    } catch (error) {
      logger.error('Error closing MCP transport:', error);
    }
    
    process.exit(0);
  }
}

// Handle graceful shutdown
const server = new SonicWallMCPServer();

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  server.shutdown();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  server.shutdown();
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});