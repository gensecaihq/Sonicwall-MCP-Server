# MCP Protocol Compliance Guide

This document outlines how the SonicWall MCP Server complies with the Model Context Protocol (MCP) specification version 2024-11-05.

## Protocol Compliance Overview

### ✅ Core Protocol Requirements

#### 1. JSON-RPC 2.0 Foundation
- **Requirement**: All MCP communication must use JSON-RPC 2.0
- **Implementation**: Uses `@modelcontextprotocol/sdk` which handles JSON-RPC 2.0 messaging
- **Validation**: All requests/responses follow JSON-RPC 2.0 format with proper `id`, `method`, and `params`

#### 2. Protocol Version Negotiation  
- **Requirement**: Support protocol version negotiation during initialization
- **Implementation**: Server responds with `protocolVersion: "2024-11-05"` during initialization
- **Location**: `src/server-mcp-compliant.ts:127`

#### 3. Capability Declaration
- **Requirement**: Declare server capabilities during initialization
- **Implementation**: 
  ```typescript
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
    logging: {}
  }
  ```
- **Location**: `src/server-mcp-compliant.ts:51-56`

### ✅ Transport Layer Compliance

#### 1. SSE Transport Implementation
- **Requirement**: Support Server-Sent Events for HTTP transport
- **Implementation**: Uses `SSEServerTransport` from MCP SDK
- **Endpoint**: `/mcp/v1/sse`
- **Location**: `src/server-mcp-compliant.ts:109`

#### 2. CORS Security
- **Requirement**: Validate Origin headers and bind to localhost
- **Implementation**:
  ```typescript
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
      'https://claude.ai',
      'https://www.claude.ai'
    ];
    // Validation logic
  }
  ```
- **Location**: `src/server-mcp-compliant.ts:73-90`

#### 3. Authentication Support
- **Requirement**: Optional authentication for transport security
- **Implementation**: Bearer token authentication via `Authorization` header
- **Location**: `src/server-mcp-compliant.ts:102-110`

### ✅ Required Message Handlers

#### 1. Initialize Handler
- **Requirement**: Handle client connection initialization
- **Implementation**: 
  ```typescript
  this.mcpServer.setRequestHandler(InitializeRequestSchema, async (request) => {
    return {
      protocolVersion: '2024-11-05',
      capabilities: this.serverCapabilities,
      serverInfo: {
        name: 'sonicwall-analyzer',
        version: '1.0.0',
        description: 'SonicWall firewall log analysis and threat detection server'
      }
    };
  });
  ```
- **Location**: `src/server-mcp-compliant.ts:122-135`

#### 2. Ping Handler
- **Requirement**: Respond to ping requests for connection testing
- **Implementation**: Returns empty object as per spec
- **Location**: `src/server-mcp-compliant.ts:137-139`

#### 3. List Tools Handler
- **Requirement**: List available tools with comprehensive schemas
- **Implementation**: Returns array of tools with JSON Schema validation
- **Location**: `src/server-mcp-compliant.ts:151-377`

#### 4. Call Tool Handler
- **Requirement**: Execute tool calls with proper validation and error handling
- **Implementation**: Full input validation, error handling, and result formatting
- **Location**: `src/server-mcp-compliant.ts:379-444`

### ✅ Tool Specification Compliance

#### 1. Input Schema Validation
- **Requirement**: Validate tool inputs against JSON Schema
- **Implementation**:
  ```typescript
  const validate = this.ajv.compile(tool.inputSchema);
  if (!validate(args)) {
    const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ') || 'Validation failed';
    throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${errors}`);
  }
  ```
- **Dependencies**: AJV with format validation
- **Location**: `src/server-mcp-compliant.ts:391-397`

#### 2. Comprehensive Tool Schemas
- **Requirement**: Provide detailed input schemas with validation rules
- **Implementation**: Each tool has complete JSON Schema with:
  - Type definitions
  - Required fields
  - Validation patterns (IP addresses, dates)
  - Min/max constraints
  - Enum values
- **Example**:
  ```typescript
  sourceIp: {
    type: 'string',
    description: 'Source IP address to search for (IPv4 format)',
    pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
  }
  ```

#### 3. Error Handling
- **Requirement**: Proper error responses using MCP error codes
- **Implementation**:
  ```typescript
  // Protocol-level errors
  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${errors}`);
  
  // Tool execution errors
  const errorResult: ToolCallResult = {
    content: [{ type: 'text', text: `Tool execution failed: ${error.message}` }],
    isError: true
  };
  ```
- **Location**: `src/server-mcp-compliant.ts:385-442`

### ✅ Content Format Support

#### 1. Text Content
- **Requirement**: Support text content in responses
- **Implementation**: All tools return structured text responses
- **Format**: JSON-formatted strings for detailed data

#### 2. Content Type Declaration
- **Requirement**: Proper content type specification
- **Implementation**:
  ```typescript
  content: [
    {
      type: 'text',
      text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
    }
  ]
  ```

### ✅ Logging and Monitoring

#### 1. Comprehensive Logging
- **Requirement**: Log all significant events for debugging
- **Implementation**: Winston-based structured logging
- **Events Logged**:
  - Client connections/disconnections
  - Tool executions with timing
  - Authentication attempts
  - Errors with full context
- **Location**: Throughout codebase with structured metadata

#### 2. Performance Monitoring
- **Implementation**: 
  ```typescript
  const executionTime = Date.now() - startTime;
  logger.info(`Tool ${name} executed successfully`, { 
    executionTime, 
    resultSize: JSON.stringify(result).length 
  });
  ```

### ✅ Security Compliance

#### 1. Input Sanitization
- **Requirement**: Validate and sanitize all inputs
- **Implementation**: JSON Schema validation with pattern matching
- **Security Features**:
  - IP address format validation
  - Port range validation (1-65535)
  - String length limits
  - Enum value validation
  - No code injection vectors

#### 2. Output Security
- **Requirement**: Ensure safe output formats
- **Implementation**:
  - No sensitive data in logs
  - Structured JSON responses only
  - No HTML or script content
  - Error message sanitization

#### 3. Rate Limiting & DoS Protection
- **Implementation**:
  - Request size limits (10MB)
  - Tool execution timeouts
  - Connection limits via Express
  - Cache TTL limits

### ✅ SonicOS Version Support

#### 1. Version-Specific API Endpoints
- **SonicOS 7.x**: `/api/sonicos/` base path
- **SonicOS 8.x**: `/api/sonicos/v8/` base path
- **Implementation**: Dynamic endpoint resolution based on version
- **Location**: `src/sonicwall/api-client-enhanced.ts:28-52`

#### 2. Authentication Methods
- **Both Versions**: Support for Bearer token and Basic auth
- **SonicOS 8.x**: Additional session ID support
- **Implementation**: Version-aware authentication handling
- **Location**: `src/sonicwall/api-client-enhanced.ts:106-172`

#### 3. Log Format Parsing
- **SonicOS 7.x**: Traditional syslog format parsing
- **SonicOS 8.x**: Enhanced format with cloud management fields
- **Implementation**: Version-specific regex patterns
- **Location**: `src/sonicwall/log-parser-enhanced.ts:14-48`

## Testing Compliance

### 1. Protocol Testing
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test MCP SSE endpoint
curl -H "Accept: text/event-stream" http://localhost:3000/mcp/v1/sse
```

### 2. Tool Validation Testing
```javascript
// Test schema validation
{
  "name": "analyze_logs",
  "arguments": {
    "query": "test", // Valid
    "hoursBack": 25,
    "invalidField": "test" // Should fail validation
  }
}
```

### 3. Error Handling Testing
- Invalid tool names → `MethodNotFound` error
- Invalid parameters → `InvalidParams` error
- Network failures → Tool execution error with `isError: true`

## Deployment Considerations

### 1. Production Security
```typescript
// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

### 2. Health Monitoring
- Health check endpoint at `/health`
- Structured logging for monitoring systems
- Performance metrics collection
- Cache statistics exposure

### 3. Configuration Management
- Environment-based configuration
- Secrets management (no hardcoded credentials)
- Version-specific settings
- Feature flags for different environments

## Compliance Checklist

- [x] JSON-RPC 2.0 message format
- [x] Protocol version negotiation (2024-11-05)
- [x] Capability declaration
- [x] SSE transport implementation
- [x] CORS origin validation
- [x] Initialize request handler
- [x] Ping request handler
- [x] List tools with schemas
- [x] Tool execution with validation
- [x] Comprehensive error handling
- [x] Input/output schema validation
- [x] Security headers (Helmet)
- [x] Rate limiting considerations
- [x] Structured logging
- [x] Performance monitoring
- [x] Health check endpoint
- [x] Documentation compliance

## MCP Client Integration

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "sonicwall": {
      "transport": "sse",
      "url": "http://localhost:3000/mcp/v1/sse",
      "headers": {
        "Authorization": "Bearer optional-token"
      }
    }
  }
}
```

### Verification Commands
```bash
# Verify protocol compliance
npm run test:mcp-compliance

# Verify SonicOS compatibility  
npm run test:sonicwall-versions

# Full integration test
npm run test:integration
```

This implementation provides full MCP protocol compliance while maintaining robust security, comprehensive error handling, and complete SonicOS 7.x/8.x compatibility.