import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';

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
  private mcpServer: Server;
  private sonicwallClient: SonicWallApiClient;
  private transport: SSEServerTransport;

  constructor() {
    this.app = express();
    this.setupExpress();
    this.setupSonicWallClient();
    this.setupMCPServer();
  }

  private setupExpress(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true,
    }));
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
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
        next();
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
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up SSE transport
    this.transport = new SSEServerTransport('/mcp/v1/sse', this.app);

    // Register tool handlers
    this.registerToolHandlers();

    // Connect server to transport
    this.mcpServer.connect(this.transport);

    logger.info('MCP server initialized with SSE transport');
  }

  private registerToolHandlers(): void {
    // List available tools
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_logs',
            description: 'Analyze SonicWall logs using natural language queries',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language query to analyze logs',
                },
                hoursBack: {
                  type: 'number',
                  description: 'Number of hours to look back (default: 24)',
                  default: 24,
                },
                logType: {
                  type: 'string',
                  enum: ['firewall', 'vpn', 'ips', 'all'],
                  description: 'Type of logs to analyze (default: all)',
                  default: 'all',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_threats',
            description: 'Get current security threats from SonicWall',
            inputSchema: {
              type: 'object',
              properties: {
                severity: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium', 'low', 'all'],
                  description: 'Filter by threat severity',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of threats to return (default: 50)',
                  default: 50,
                },
              },
            },
          },
          {
            name: 'search_connections',
            description: 'Search network connections by IP or port',
            inputSchema: {
              type: 'object',
              properties: {
                sourceIp: {
                  type: 'string',
                  description: 'Source IP address to search for',
                },
                destIp: {
                  type: 'string',
                  description: 'Destination IP address to search for',
                },
                port: {
                  type: 'number',
                  description: 'Port number to search for',
                },
                action: {
                  type: 'string',
                  enum: ['allow', 'deny', 'all'],
                  description: 'Filter by connection action',
                },
              },
            },
          },
          {
            name: 'get_stats',
            description: 'Get network statistics and summaries',
            inputSchema: {
              type: 'object',
              properties: {
                metric: {
                  type: 'string',
                  enum: ['top_blocked_ips', 'top_allowed_ips', 'port_summary', 'threat_summary'],
                  description: 'Type of statistics to retrieve',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                  default: 10,
                },
              },
              required: ['metric'],
            },
          },
          {
            name: 'export_logs',
            description: 'Export filtered logs in various formats',
            inputSchema: {
              type: 'object',
              properties: {
                format: {
                  type: 'string',
                  enum: ['json', 'csv'],
                  description: 'Export format',
                },
                filters: {
                  type: 'object',
                  properties: {
                    startTime: {
                      type: 'string',
                      description: 'Start time (ISO 8601 format)',
                    },
                    endTime: {
                      type: 'string',
                      description: 'End time (ISO 8601 format)',
                    },
                    severity: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Array of severity levels to include',
                    },
                  },
                },
              },
              required: ['format'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;

        switch (name) {
          case 'analyze_logs':
            result = await analyzeLogs(this.sonicwallClient, args);
            break;
          case 'get_threats':
            result = await getThreats(this.sonicwallClient, args);
            break;
          case 'search_connections':
            result = await searchConnections(this.sonicwallClient, args);
            break;
          case 'get_stats':
            result = await getStats(this.sonicwallClient, args);
            break;
          case 'export_logs':
            result = await exportLogs(this.sonicwallClient, args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`Tool ${name} failed:`, error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Test SonicWall connection
      await this.sonicwallClient.authenticate();
      logger.info('Successfully authenticated with SonicWall');

      // Start Express server
      this.app.listen(appConfig.server.port, () => {
        logger.info(`SonicWall MCP Server started on port ${appConfig.server.port}`);
        logger.info(`Health check available at http://localhost:${appConfig.server.port}/health`);
        logger.info(`MCP SSE endpoint available at http://localhost:${appConfig.server.port}/mcp/v1/sse`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down SonicWall MCP Server...');
    
    if (this.transport) {
      await this.transport.close();
    }
    
    process.exit(0);
  }
}

// Handle graceful shutdown
const server = new SonicWallMCPServer();

process.on('SIGINT', () => server.shutdown());
process.on('SIGTERM', () => server.shutdown());

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});