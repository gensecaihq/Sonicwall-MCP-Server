# SonicWall MCP Server - Enhanced & Fully Compliant

A comprehensive Model Context Protocol (MCP) server for analyzing SonicWall firewall logs from SonicOS 7.x and 8.x. This server provides intelligent log analysis, threat detection, and security insights through a fully MCP-compliant interface using SSE/HTTP transport.

## 🌟 Key Features

### 🔒 **Full MCP 2024-11-05 Protocol Compliance**
- Complete JSON-RPC 2.0 implementation
- SSE transport with proper CORS handling  
- Comprehensive input/output validation using JSON Schema
- Full capability negotiation and error handling
- Structured logging and performance monitoring

### 🛡️ **Advanced SonicOS Support**
- **SonicOS 7.x**: Traditional API endpoints and syslog parsing
- **SonicOS 8.x**: Enhanced API with cloud management and ATP features
- Version-aware endpoint resolution and authentication
- Support for structured JSON logs and traditional syslog formats

### 🔍 **Intelligent Security Analysis**
- **analyze_logs**: Natural language queries with pattern recognition
- **get_threats**: Real-time threat detection with recommendations  
- **search_connections**: Advanced connection analysis with insights
- **get_stats**: Comprehensive metrics with security intelligence
- **export_logs**: Multi-format export with validation

### 🚀 **Production-Ready Architecture**
- Docker containerization with security hardening
- In-memory caching with intelligent TTL management
- Comprehensive error handling and retry logic
- Authentication and authorization support
- Health monitoring and observability

## 📋 Requirements

- **Node.js**: 20.x or higher
- **Docker**: 24.x or higher (for containerized deployment)
- **SonicWall Device**: SonicOS 7.x or 8.x with API access enabled
- **Network Access**: HTTPS connectivity to SonicWall management interface

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd sonicwall-mcp-server

# Copy and configure environment
cp .env.example .env
# Edit .env with your SonicWall credentials
```

### 2. Configuration
Edit `.env` file with your SonicWall details:
```env
# SonicWall Configuration
SONICWALL_HOST=192.168.1.1
SONICWALL_USERNAME=admin  
SONICWALL_PASSWORD=your_secure_password
SONICWALL_VERSION=7  # or 8

# Server Configuration
PORT=3000
LOG_LEVEL=info
CACHE_TTL_SECONDS=300

# Optional Authentication
MCP_BEARER_TOKEN=your_optional_token
```

### 3. Deployment Options

#### Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f sonicwall-mcp
```

#### Local Development
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start

# Or for development with hot reload
npm run dev
```

### 4. Verify Installation
```bash
# Check health endpoint
curl http://localhost:3000/health

# Response should include:
# {"status":"healthy","protocol":"MCP/2024-11-05",...}
```

## 🔧 MCP Tool Reference

### 1. `analyze_logs`
Analyze SonicWall logs using natural language queries.

**Parameters:**
```typescript
{
  query: string;        // Natural language query (required)
  hoursBack?: number;   // Hours to look back (1-168, default: 24) 
  logType?: string;     // 'firewall'|'vpn'|'ips'|'antivirus'|'system'|'all'
}
```

**Example Queries:**
```javascript
// Security analysis
"show blocked connections from suspicious IPs"
"find critical threats from last 2 hours"
"analyze VPN authentication failures today"

// Network investigation  
"connections to port 22 or 3389 from external IPs"
"high-volume traffic patterns from internal hosts"
"malware detections and their source locations"
```

### 2. `get_threats`
Retrieve current security threats with analysis.

**Parameters:**
```typescript
{
  severity?: string;      // 'critical'|'high'|'medium'|'low'|'all'
  limit?: number;         // Max results (1-1000, default: 50)
  includeBlocked?: boolean; // Include blocked threats (default: true)
}
```

### 3. `search_connections` 
Search network connections with security insights.

**Parameters:**
```typescript
{
  sourceIp?: string;     // Source IP (IPv4 format)
  destIp?: string;       // Destination IP (IPv4 format)  
  port?: number;         // Port number (1-65535)
  action?: string;       // 'allow'|'deny'|'drop'|'reset'|'all'
  hoursBack?: number;    // Hours to search (1-168, default: 24)
  limit?: number;        // Max results (1-5000, default: 100)
}
```

### 4. `get_stats`
Retrieve comprehensive network statistics.

**Parameters:**
```typescript
{
  metric: string;        // Required: 'top_blocked_ips'|'top_allowed_ips'|
                        //          'port_summary'|'threat_summary'|
                        //          'protocol_breakdown'|'hourly_traffic'
  limit?: number;        // Max results (1-100, default: 10)
  hoursBack?: number;    // Hours to analyze (1-168, default: 24)
}
```

### 5. `export_logs`
Export filtered logs in multiple formats.

**Parameters:**
```typescript
{
  format: string;        // Required: 'json'|'csv'
  filters?: {
    startTime?: string;    // ISO 8601 datetime
    endTime?: string;      // ISO 8601 datetime  
    severity?: string[];   // Array of severity levels
    logType?: string;      // Log category
    sourceIp?: string;     // Source IP filter
    destIp?: string;       // Destination IP filter
    action?: string;       // Action filter
  };
  limit?: number;         // Max entries (1-100000, default: 10000)
}
```

## 🔗 Client Integration

### Claude Desktop
Add to `~/.config/claude-desktop/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sonicwall": {
      "transport": "sse",
      "url": "http://localhost:3000/mcp/v1/sse",
      "headers": {
        "Authorization": "Bearer your_optional_token"
      }
    }
  }
}
```

### MCP Client Libraries
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const transport = new SSEClientTransport('http://localhost:3000/mcp/v1/sse');
const client = new Client({ name: 'sonicwall-client', version: '1.0.0' }, {});

await client.connect(transport);
const result = await client.callTool({
  name: 'analyze_logs',
  arguments: { query: 'show blocked connections from last hour' }
});
```

## 🏗️ Architecture

### System Overview
```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Claude Code │◄──►│ MCP Server       │◄──►│ SonicWall       │
│             │SSE │ (Port 3000)      │API │ Firewall        │
└─────────────┘    └──────────────────┘    └─────────────────┘
                           │
                           ▼
                   ┌──────────────────┐
                   │ Enhanced Caching │
                   │ & Log Processing │
                   └──────────────────┘
```

### Core Components

#### 1. **MCP Server** (`src/server-mcp-compliant.ts`)
- Full MCP 2024-11-05 protocol implementation
- SSE transport with CORS security
- JSON Schema validation using AJV
- Comprehensive error handling and logging

#### 2. **Enhanced API Client** (`src/sonicwall/api-client-enhanced.ts`) 
- Version-aware endpoint management
- Advanced authentication handling
- Intelligent retry and failover logic
- Performance monitoring and caching

#### 3. **Advanced Log Parser** (`src/sonicwall/log-parser-enhanced.ts`)
- SonicOS 7.x traditional syslog parsing  
- SonicOS 8.x enhanced format with cloud fields
- ATP (Advanced Threat Protection) support
- Structured JSON log processing

#### 4. **Intelligence Engines** (`src/tools/`)
- Natural language query processing
- Security pattern recognition
- Threat correlation and analysis  
- Automated insights and recommendations

## 📊 SonicOS Version Differences

### SonicOS 7.x Support
- **API Base**: `/api/sonicos/`
- **Authentication**: Bearer token, Basic auth
- **Log Format**: Traditional syslog format
- **Features**: Standard firewall, VPN, IPS logging

### SonicOS 8.x Enhancements  
- **API Base**: `/api/sonicos/v8/`
- **Authentication**: Bearer token, Basic auth, Session ID
- **Log Format**: Enhanced with cloud management fields
- **Additional Features**:
  - Cloud management integration (`cloudId`, `tenantId`)
  - Advanced Threat Protection (ATP) logs
  - Capture ATP analysis results
  - Enhanced metadata fields

### API Endpoints by Version

| Feature | SonicOS 7.x | SonicOS 8.x |
|---------|-------------|-------------|
| Authentication | `/api/sonicos/auth` | `/api/sonicos/v8/auth` |
| Log Monitor | `/api/sonicos/reporting/log-monitor` | `/api/sonicos/v8/reporting/log-monitor` |
| Threats | `/api/sonicos/security-services/...` | `/api/sonicos/v8/security-services/...` |
| Cloud Mgmt | ❌ | `/api/sonicos/v8/cloud-management` |
| Capture ATP | ❌ | `/api/sonicos/v8/security-services/capture-atp` |

## 🔒 Security & Compliance

### Security Features
- **Transport Security**: HTTPS enforcement, CORS validation
- **Authentication**: Bearer token, rate limiting
- **Input Validation**: Comprehensive schema validation  
- **Output Sanitization**: Structured responses only
- **Container Security**: Non-root user, read-only filesystem

### MCP Protocol Compliance
- ✅ JSON-RPC 2.0 message format
- ✅ Protocol version negotiation (2024-11-05)
- ✅ SSE transport implementation
- ✅ Capability declaration and discovery
- ✅ Comprehensive error handling
- ✅ Input/output schema validation
- ✅ Security headers and CORS

### Data Privacy
- No sensitive data logged or cached
- Configurable data retention policies
- Local processing (no external API calls)
- GDPR-compliant data handling

## 🔧 Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type checking
npm run typecheck

# Build for production
npm run build
```

### Docker Development
```bash
# Development with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker-compose logs -f

# Shell access
docker-compose exec sonicwall-mcp bash
```

### Testing Framework
```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# MCP compliance tests
npm run test:mcp-compliance

# SonicWall compatibility tests
npm run test:sonicwall
```

## 📈 Monitoring & Observability

### Health Monitoring
```bash
# Health check endpoint
curl http://localhost:3000/health

# Response includes:
# - Server status and uptime
# - MCP protocol version
# - SonicWall connection status  
# - Cache statistics
# - Performance metrics
```

### Logging
Structured JSON logging with Winston:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info", 
  "service": "sonicwall-mcp-server",
  "message": "Tool analyze_logs executed successfully",
  "executionTime": 245,
  "resultSize": 15420
}
```

### Performance Metrics
- Tool execution times
- Cache hit/miss rates  
- API response times
- Memory usage statistics

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SONICWALL_HOST` | ✅ | - | SonicWall device IP/hostname |
| `SONICWALL_USERNAME` | ✅ | - | Admin username |
| `SONICWALL_PASSWORD` | ✅ | - | Admin password |
| `SONICWALL_VERSION` | ❌ | `7` | SonicOS version (7 or 8) |
| `PORT` | ❌ | `3000` | Server port |
| `LOG_LEVEL` | ❌ | `info` | Logging level |
| `CACHE_TTL_SECONDS` | ❌ | `300` | Cache TTL in seconds |
| `MCP_BEARER_TOKEN` | ❌ | - | Optional API authentication |
| `NODE_ENV` | ❌ | `development` | Environment mode |

### Advanced Configuration

#### Cache Configuration
```env
CACHE_TTL_SECONDS=300        # General cache TTL
CACHE_MAX_SIZE=1000          # Max cache entries
CACHE_CLEANUP_INTERVAL=60    # Cleanup interval in seconds
```

#### Security Configuration  
```env
CORS_ORIGINS=https://claude.ai,https://localhost:3000
RATE_LIMIT_WINDOW=900        # Rate limit window (15 min)
RATE_LIMIT_MAX=100           # Max requests per window
```

#### SonicWall API Configuration
```env
SONICWALL_TIMEOUT=30000      # API timeout in ms
SONICWALL_MAX_RETRIES=3      # Max retry attempts
SONICWALL_RETRY_DELAY=1000   # Retry delay in ms
```

## 🚨 Troubleshooting

### Common Issues

#### Authentication Failures
```bash
# Test SonicWall connectivity
curl -k https://YOUR_SONICWALL_HOST/api/sonicos/auth \
  -H "Content-Type: application/json" \
  -d '{"user":"admin","password":"password"}'

# Check API is enabled in SonicWall:
# MANAGE | System Setup | Appliance > Base Settings > SonicOS API
```

#### Connection Issues
```bash
# Verify network connectivity
ping YOUR_SONICWALL_HOST

# Check firewall rules allow HTTPS traffic
nmap -p 443 YOUR_SONICWALL_HOST

# Verify SSL certificate (if using custom CA)
openssl s_client -connect YOUR_SONICWALL_HOST:443 -verify_return_error
```

#### MCP Client Issues
```bash
# Verify SSE endpoint
curl -H "Accept: text/event-stream" http://localhost:3000/mcp/v1/sse

# Check CORS headers
curl -H "Origin: https://claude.ai" -I http://localhost:3000/mcp/v1/sse
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# View detailed logs
docker-compose logs -f sonicwall-mcp | grep -E "(ERROR|WARN|DEBUG)"
```

### Performance Issues
- **High Memory Usage**: Reduce `CACHE_TTL_SECONDS` or limit concurrent requests
- **Slow API Responses**: Check SonicWall device load and network latency
- **Cache Misses**: Verify cache configuration and TTL settings

## 📚 API Examples

### Security Incident Response Workflow

1. **Initial Threat Assessment**
```json
{
  "name": "get_threats",
  "arguments": {
    "severity": "critical",
    "limit": 20
  }
}
```

2. **Detailed Log Analysis** 
```json
{
  "name": "analyze_logs",
  "arguments": {
    "query": "show all activity from suspicious IP 203.0.113.10 in last 4 hours",
    "hoursBack": 4
  }
}
```

3. **Connection Pattern Investigation**
```json
{
  "name": "search_connections", 
  "arguments": {
    "sourceIp": "203.0.113.10",
    "hoursBack": 24,
    "limit": 500
  }
}
```

4. **Evidence Export**
```json
{
  "name": "export_logs",
  "arguments": {
    "format": "json",
    "filters": {
      "sourceIp": "203.0.113.10",
      "severity": ["critical", "high"],
      "startTime": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Network Performance Analysis

1. **Traffic Statistics**
```json
{
  "name": "get_stats",
  "arguments": {
    "metric": "top_allowed_ips",
    "limit": 50,
    "hoursBack": 24
  }
}
```

2. **Port Usage Analysis**
```json
{
  "name": "get_stats",
  "arguments": {
    "metric": "port_summary", 
    "limit": 25
  }
}
```

3. **Protocol Breakdown**
```json
{
  "name": "get_stats",
  "arguments": {
    "metric": "protocol_breakdown",
    "hoursBack": 168
  }
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards
- TypeScript strict mode
- ESLint configuration compliance
- 100% test coverage for new features
- JSDoc comments for public APIs
- Conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📚 **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- 📧 **Security Issues**: security@yourorganization.com

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the excellent specification
- [SonicWall](https://www.sonicwall.com/) for comprehensive API documentation
- [Claude Code](https://claude.ai/code) for the development platform
- Open source community for invaluable tools and libraries

---

**🔒 Built with security-first principles for the cybersecurity community**

*This server provides comprehensive SonicWall log analysis while maintaining full MCP protocol compliance and enterprise-grade security.*