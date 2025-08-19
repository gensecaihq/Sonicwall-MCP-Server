# SonicWall MCP Server

> **Professional SonicWall log analysis and threat detection via Model Context Protocol**

A production-ready MCP server that provides intelligent analysis of SonicWall firewall logs through natural language queries. Fully compliant with MCP 2024-11-05 specification and supports both SonicOS 7.x and 8.x.

[![MCP Compatible](https://img.shields.io/badge/MCP-2024--11--05-blue)](https://modelcontextprotocol.io/)
[![SonicOS Support](https://img.shields.io/badge/SonicOS-7.x%20%7C%208.x-orange)](https://www.sonicwall.com/)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED)](https://hub.docker.com/)
[![Security First](https://img.shields.io/badge/Security-First-green)](docs/SECURITY.md)

## ✨ Features

- 🔍 **Natural Language Log Analysis** - Query firewall logs using plain English
- 🛡️ **Real-time Threat Detection** - Identify and analyze security threats instantly  
- 🌐 **Dual Version Support** - Works with both SonicOS 7.x and 8.x
- 🚀 **Production Ready** - Docker deployment with enterprise security
- 📊 **Rich Analytics** - Network statistics and behavioral insights
- 🔒 **MCP Compliant** - Full protocol compliance for seamless integration

## 📋 Quick Start

### Prerequisites

- **SonicWall Device** running SonicOS 7.x or 8.x
- **API Access** enabled on your SonicWall (MANAGE > System Setup > Appliance > SonicOS API)
- **Docker & Docker Compose** (recommended) or Node.js 20+

### 1. Get the Server

```bash
git clone https://github.com/your-org/sonicwall-mcp-server.git
cd sonicwall-mcp-server
```

### 2. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit with your SonicWall details
nano .env
```

Required configuration:
```env
SONICWALL_HOST=192.168.1.1
SONICWALL_USERNAME=admin
SONICWALL_PASSWORD=your_password
SONICWALL_VERSION=7  # or 8 for SonicOS 8.x
```

### 3. Start the Server

**Using Docker (Recommended):**
```bash
docker-compose up -d
```

**Using Node.js:**
```bash
npm install
npm run build
npm start
```

### 4. Verify Installation

```bash
# Check server health
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","protocol":"MCP/2024-11-05","version":"1.0.0"}
```

## 🔗 Connect to Claude

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sonicwall": {
      "transport": "sse",
      "url": "http://localhost:3000/mcp/v1/sse"
    }
  }
}
```

**That's it!** Start using SonicWall analysis in Claude:

> *"Show me blocked connections from the last hour"*  
> *"Find critical security threats from today"*  
> *"Analyze VPN authentication failures"*

## 🛠️ Available Tools

### `analyze_logs`
**Natural language log analysis with intelligent insights**

```typescript
// Example usage in Claude
"Show me suspicious network activity from external IPs in the last 2 hours"
"Find brute force attacks on SSH and RDP ports"
"Analyze malware detections and their source locations"
```

### `get_threats` 
**Real-time threat monitoring and analysis**

```typescript
// Get critical threats
{
  "severity": "critical",
  "limit": 20
}
```

### `search_connections`
**Advanced connection search and investigation**

```typescript
// Investigate specific IP
{
  "sourceIp": "192.168.1.100",
  "hoursBack": 24,
  "limit": 500
}
```

### `get_stats`
**Network statistics and security metrics**

```typescript
// Get top blocked IPs
{
  "metric": "top_blocked_ips",
  "limit": 10
}
```

### `export_logs`
**Export filtered logs for compliance and analysis**

```typescript
// Export security events as CSV
{
  "format": "csv",
  "filters": {
    "severity": ["critical", "high"],
    "startTime": "2024-01-01T00:00:00Z"
  }
}
```

## 📖 Documentation

- **[Complete Usage Guide](docs/USAGE.md)** - Detailed examples and use cases
- **[Configuration Reference](docs/CONFIGURATION.md)** - All settings explained
- **[API Documentation](docs/API.md)** - Complete tool specifications
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Security Guide](docs/SECURITY.md)** - Security best practices
- **[MCP Compliance](docs/MCP_COMPLIANCE.md)** - Protocol compliance details

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Claude Code │◄──►│ MCP Server      │◄──►│ SonicWall   │
│             │SSE │ (Port 3000)     │API │ Device      │
└─────────────┘    └─────────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────────┐
                   │ Log Analysis    │
                   │ & Intelligence  │
                   └─────────────────┘
```

**Key Components:**
- **MCP Server**: Full protocol compliance with SSE transport
- **SonicWall Client**: Version-aware API integration (7.x/8.x)
- **Log Parser**: Advanced parsing for multiple log formats
- **Analysis Engine**: Natural language processing and threat correlation
- **Cache Layer**: High-performance in-memory caching

## 🔧 Configuration

### Basic Configuration
```env
# SonicWall Connection
SONICWALL_HOST=your.firewall.ip
SONICWALL_USERNAME=admin
SONICWALL_PASSWORD=secure_password
SONICWALL_VERSION=7

# Server Settings  
PORT=3000
LOG_LEVEL=info
CACHE_TTL_SECONDS=300
```

### Advanced Configuration
```env
# Authentication (Optional)
MCP_BEARER_TOKEN=your_secret_token

# Performance Tuning
CACHE_MAX_SIZE=1000
API_TIMEOUT=30000
MAX_RETRIES=3

# Security
CORS_ORIGINS=https://claude.ai,https://localhost:3000
RATE_LIMIT_MAX=100
```

## 🐳 Docker Deployment

### Production Deployment
```yaml
version: '3.8'
services:
  sonicwall-mcp:
    image: sonicwall-mcp-server:latest
    ports:
      - "3000:3000"
    environment:
      - SONICWALL_HOST=192.168.1.1
      - SONICWALL_USERNAME=admin
      - SONICWALL_PASSWORD=your_password
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Development with Hot Reload
```bash
# Development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## 🧪 Testing & Validation

### Quick Health Check
```bash
# Server status
curl http://localhost:3000/health

# MCP endpoint test
curl -H "Accept: text/event-stream" http://localhost:3000/mcp/v1/sse
```

### SonicWall Connectivity Test
```bash
# Test authentication
curl -k https://YOUR_SONICWALL/api/sonicos/auth \
  -H "Content-Type: application/json" \
  -d '{"user":"admin","password":"your_password"}'
```

### Run Test Suite
```bash
# All tests
npm test

# MCP compliance tests
npm run test:mcp

# SonicWall integration tests  
npm run test:integration
```

## 🔒 Security

### Security Features
- ✅ **Transport Security** - HTTPS enforcement and CORS validation
- ✅ **Authentication** - Bearer token support with rate limiting
- ✅ **Input Validation** - Comprehensive schema validation
- ✅ **Container Security** - Non-root user, read-only filesystem
- ✅ **Data Privacy** - No sensitive data logging or external calls

### Security Checklist
- [ ] Enable API access only from trusted networks
- [ ] Use strong passwords for SonicWall admin accounts  
- [ ] Configure MCP_BEARER_TOKEN for additional security
- [ ] Monitor logs for unusual activity
- [ ] Keep SonicWall firmware updated
- [ ] Review firewall rules regularly

## 🚨 Common Issues

### ❌ "Authentication Failed"
**Problem**: Cannot connect to SonicWall API
```bash
# Check API is enabled
# SonicWall: MANAGE > System Setup > Appliance > SonicOS API ✓

# Test connectivity
ping YOUR_SONICWALL_HOST
curl -k https://YOUR_SONICWALL_HOST/api/sonicos/auth
```

### ❌ "No logs returned"
**Problem**: Empty responses from log queries
```bash
# Check log levels in SonicWall
# Log > Settings > Categories > Enable required log types

# Verify time synchronization
date
```

### ❌ "CORS Error in Browser"
**Problem**: Browser blocks MCP requests
```env
# Add your domain to CORS_ORIGINS
CORS_ORIGINS=https://claude.ai,https://your-domain.com
```

## 📊 Monitoring & Observability

### Health Monitoring
```bash
# Detailed health status
curl http://localhost:3000/health | jq

# Response includes:
# - Server uptime and status
# - SonicWall connectivity
# - Cache statistics  
# - Memory usage
```

### Performance Metrics
```bash
# View performance logs
docker-compose logs sonicwall-mcp | grep "executed successfully"

# Example output:
# {"timestamp":"2024-01-01T12:00:00.000Z","level":"info","message":"Tool analyze_logs executed successfully","executionTime":245,"resultSize":15420}
```

### Log Analysis
```bash
# Error monitoring
docker-compose logs sonicwall-mcp | grep ERROR

# Performance tracking
docker-compose logs sonicwall-mcp | grep "execution time"
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md).

### Development Setup
```bash
# Fork and clone
git clone https://github.com/your-username/sonicwall-mcp-server.git
cd sonicwall-mcp-server

# Install dependencies  
npm install

# Start development server
npm run dev

# Run tests
npm test

# Submit PR
git checkout -b feature/amazing-feature
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- 🐛 **Issues**: [GitHub Issues](https://github.com/your-org/sonicwall-mcp-server/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-org/sonicwall-mcp-server/discussions)  
- 📚 **Documentation**: [Project Wiki](https://github.com/your-org/sonicwall-mcp-server/wiki)
- 📧 **Security**: security@yourorganization.com

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the excellent specification
- [SonicWall](https://www.sonicwall.com/) for comprehensive API documentation  
- [Claude Code](https://claude.ai/code) community for feedback and testing
- All contributors and users who make this project better

---

<div align="center">

**🔒 Built with security-first principles for enterprise cybersecurity teams**

[Get Started](docs/USAGE.md) • [API Docs](docs/API.md) • [Troubleshooting](docs/TROUBLESHOOTING.md)

</div>