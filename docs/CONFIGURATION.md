# Configuration Reference

Complete configuration guide for the SonicWall MCP Server, covering all settings, environment variables, and deployment options.

## Table of Contents

- [Environment Variables](#environment-variables)
- [SonicWall Configuration](#sonicwall-configuration)
- [Server Settings](#server-settings) 
- [Security Configuration](#security-configuration)
- [Performance Tuning](#performance-tuning)
- [Docker Configuration](#docker-configuration)
- [Advanced Settings](#advanced-settings)

## Environment Variables

### Required Configuration

```env
# SonicWall Device Connection (REQUIRED)
SONICWALL_HOST=192.168.1.1
SONICWALL_USERNAME=admin
SONICWALL_PASSWORD=your_secure_password
```

### Optional Configuration

```env
# SonicWall Settings
SONICWALL_VERSION=7                    # SonicOS version: 7 or 8

# Server Settings
PORT=3000                              # HTTP server port
LOG_LEVEL=info                         # Logging level
NODE_ENV=production                    # Environment mode

# Cache Settings  
CACHE_TTL_SECONDS=300                  # Cache TTL in seconds
CACHE_MAX_SIZE=1000                    # Maximum cache entries
CACHE_CLEANUP_INTERVAL=60              # Cache cleanup interval

# Security Settings
MCP_BEARER_TOKEN=                      # Optional MCP authentication token
CORS_ORIGINS=https://claude.ai         # Allowed CORS origins

# Performance Settings
API_TIMEOUT=30000                      # SonicWall API timeout (ms)
MAX_RETRIES=3                          # Max API retry attempts
RETRY_DELAY=1000                       # Retry delay (ms)

# Rate Limiting
RATE_LIMIT_WINDOW=900                  # Rate limit window (seconds)
RATE_LIMIT_MAX=100                     # Max requests per window
```

## SonicWall Configuration

### Connection Settings

#### SONICWALL_HOST
- **Purpose**: SonicWall device IP address or hostname
- **Format**: IPv4 address or FQDN
- **Examples**:
  ```env
  SONICWALL_HOST=192.168.1.1
  SONICWALL_HOST=firewall.company.com  
  SONICWALL_HOST=10.0.0.1
  ```

#### SONICWALL_USERNAME / SONICWALL_PASSWORD
- **Purpose**: Admin credentials for SonicWall API access
- **Requirements**:
  - Admin-level access required
  - API access must be enabled in SonicWall
- **Security**: Use environment variables or secrets management

#### SONICWALL_VERSION
- **Purpose**: Specify SonicOS version for API compatibility
- **Values**: `7` (default) or `8`
- **Impact**: 
  - Different API endpoints
  - Different log formats
  - Version-specific features

```env
# For SonicOS 7.x
SONICWALL_VERSION=7

# For SonicOS 8.x (enhanced features)
SONICWALL_VERSION=8
```

### SonicWall API Prerequisites

1. **Enable API Access**:
   - Navigate to: **MANAGE** → **System Setup** → **Appliance** → **Base Settings**
   - Scroll to **SonicOS API** section
   - Select authentication method:
     - **RFC 2617 HTTP Basic Access Authentication**
     - **CHAP Authentication and RFC 2617 HTTP Basic Access**

2. **Network Access**:
   - Ensure HTTPS (port 443) connectivity
   - Configure firewall rules if needed
   - Verify SSL certificate (self-signed certificates are supported)

3. **User Permissions**:
   - Admin-level user account required
   - Full read access to logs and system information

## Server Settings

### PORT
- **Default**: `3000`
- **Description**: HTTP server listening port
- **Usage**:
  ```env
  PORT=3000              # Standard port
  PORT=8080              # Alternative port
  ```

### LOG_LEVEL
- **Default**: `info`
- **Values**: `error`, `warn`, `info`, `debug`
- **Impact**:
  - `error`: Only errors logged
  - `warn`: Errors and warnings
  - `info`: Standard operational logging
  - `debug`: Verbose logging (development only)

```env
# Production
LOG_LEVEL=info

# Development  
LOG_LEVEL=debug

# Minimal logging
LOG_LEVEL=error
```

### NODE_ENV
- **Default**: `development`
- **Values**: `development`, `production`, `test`
- **Impact**:
  - Security headers
  - Error handling verbosity
  - Performance optimizations

## Security Configuration

### MCP_BEARER_TOKEN
- **Purpose**: Optional authentication for MCP endpoints
- **Format**: String token
- **Usage**:
  ```env
  MCP_BEARER_TOKEN=your_secret_token_here
  ```
- **Client Configuration**:
  ```json
  {
    "mcpServers": {
      "sonicwall": {
        "transport": "sse",
        "url": "http://localhost:3000/mcp/v1/sse",
        "headers": {
          "Authorization": "Bearer your_secret_token_here"
        }
      }
    }
  }
  ```

### CORS_ORIGINS
- **Purpose**: Control allowed origins for CORS requests
- **Format**: Comma-separated URLs
- **Default**: Allows localhost and Claude.ai
- **Examples**:
  ```env
  # Single origin
  CORS_ORIGINS=https://claude.ai
  
  # Multiple origins  
  CORS_ORIGINS=https://claude.ai,https://localhost:3000,https://your-domain.com
  
  # Allow all (NOT recommended for production)
  CORS_ORIGINS=*
  ```

### SSL/TLS Configuration

For production deployment with HTTPS:

```env
# SSL Certificate paths (if using custom certificates)
SSL_CERT_PATH=/path/to/certificate.pem
SSL_KEY_PATH=/path/to/private-key.pem
SSL_CA_PATH=/path/to/ca-bundle.pem

# Force HTTPS redirect
FORCE_HTTPS=true
```

## Performance Tuning

### Cache Settings

#### CACHE_TTL_SECONDS
- **Default**: `300` (5 minutes)  
- **Range**: `60-3600` seconds
- **Impact**: Balance between performance and data freshness
- **Recommendations**:
  ```env
  # High-performance (less fresh data)
  CACHE_TTL_SECONDS=600
  
  # Balanced (recommended)
  CACHE_TTL_SECONDS=300
  
  # Fresh data (lower performance)  
  CACHE_TTL_SECONDS=120
  ```

#### CACHE_MAX_SIZE
- **Default**: `1000` entries
- **Range**: `100-10000`
- **Memory Impact**: ~100KB per 1000 entries
- **Tuning**:
  ```env
  # High-memory systems
  CACHE_MAX_SIZE=5000
  
  # Standard systems  
  CACHE_MAX_SIZE=1000
  
  # Low-memory systems
  CACHE_MAX_SIZE=500
  ```

### API Performance

#### API_TIMEOUT
- **Default**: `30000` ms (30 seconds)
- **Range**: `5000-120000` ms
- **Usage**:
  ```env
  # Fast networks
  API_TIMEOUT=15000
  
  # Standard timeout
  API_TIMEOUT=30000
  
  # Slow/unreliable networks
  API_TIMEOUT=60000
  ```

#### MAX_RETRIES
- **Default**: `3`
- **Range**: `0-10`
- **Considerations**:
  ```env
  # No retries (fast failure)
  MAX_RETRIES=0
  
  # Balanced (recommended)
  MAX_RETRIES=3
  
  # High resilience (slower failure)
  MAX_RETRIES=5
  ```

### Rate Limiting

#### RATE_LIMIT_WINDOW
- **Default**: `900` seconds (15 minutes)
- **Purpose**: Rate limiting time window

#### RATE_LIMIT_MAX  
- **Default**: `100` requests
- **Purpose**: Maximum requests per window
- **Tuning**:
  ```env
  # High-traffic environments
  RATE_LIMIT_MAX=200
  RATE_LIMIT_WINDOW=900
  
  # Standard usage
  RATE_LIMIT_MAX=100
  RATE_LIMIT_WINDOW=900
  
  # Restricted usage
  RATE_LIMIT_MAX=50
  RATE_LIMIT_WINDOW=600
  ```

## Docker Configuration

### Environment File (.env)
```env
# Production configuration
NODE_ENV=production
LOG_LEVEL=info
CACHE_TTL_SECONDS=300

# SonicWall connection
SONICWALL_HOST=${SONICWALL_HOST}
SONICWALL_USERNAME=${SONICWALL_USERNAME}
SONICWALL_PASSWORD=${SONICWALL_PASSWORD}
SONICWALL_VERSION=7

# Server settings
PORT=3000
MCP_BEARER_TOKEN=${MCP_BEARER_TOKEN}
```

### Docker Compose Override

#### docker-compose.override.yml (Development)
```yaml
version: '3.8'
services:
  sonicwall-mcp:
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - CACHE_TTL_SECONDS=60
    volumes:
      - ./src:/app/src:ro
    command: npm run dev
```

#### docker-compose.prod.yml (Production)
```yaml
version: '3.8'
services:
  sonicwall-mcp:
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
      - CACHE_TTL_SECONDS=300
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.5'
```

## Advanced Settings

### Custom Configuration File

Create `config/custom.json` for advanced settings:

```json
{
  "sonicwall": {
    "apiEndpoints": {
      "custom": "/api/custom/endpoint"
    },
    "retryConfig": {
      "attempts": 3,
      "delay": 1000,
      "backoff": 2.0
    }
  },
  "cache": {
    "strategies": {
      "logs": 300,
      "threats": 60,
      "stats": 600
    }
  },
  "analysis": {
    "maxQueryLength": 500,
    "defaultLimit": 100,
    "patterns": {
      "customPatterns": []
    }
  }
}
```

### Logging Configuration

#### Winston Configuration
```json
{
  "logging": {
    "level": "info",
    "format": "json",
    "transports": [
      {
        "type": "console",
        "colorize": true
      },
      {
        "type": "file", 
        "filename": "/var/log/sonicwall-mcp.log",
        "maxSize": "100MB",
        "maxFiles": 10
      }
    ]
  }
}
```

### Health Check Configuration

```env
# Health check settings
HEALTH_CHECK_INTERVAL=30000        # Interval between checks (ms)
HEALTH_CHECK_TIMEOUT=5000          # Health check timeout (ms)  
HEALTH_CHECK_RETRIES=3             # Failed check retries
```

## Configuration Validation

### Startup Validation

The server validates configuration on startup:

1. **Required variables**: `SONICWALL_HOST`, `SONICWALL_USERNAME`, `SONICWALL_PASSWORD`
2. **Format validation**: IP addresses, ports, time ranges
3. **Connection testing**: SonicWall API connectivity
4. **Dependency checking**: Required packages and versions

### Runtime Configuration

```bash
# Verify current configuration
curl http://localhost:3000/health

# Example response
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z", 
  "version": "1.0.0",
  "protocol": "MCP/2024-11-05",
  "config": {
    "sonicwallVersion": "7",
    "cacheEnabled": true,
    "cacheTTL": 300,
    "rateLimitEnabled": true
  },
  "sonicwall": {
    "connected": true,
    "version": "SonicOS 7.0.1",
    "lastCheck": "2024-01-01T11:59:30.000Z"
  }
}
```

## Configuration Templates

### Development Environment
```env
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

SONICWALL_HOST=192.168.1.1
SONICWALL_USERNAME=admin
SONICWALL_PASSWORD=password
SONICWALL_VERSION=7

CACHE_TTL_SECONDS=60
API_TIMEOUT=15000
MAX_RETRIES=1

CORS_ORIGINS=http://localhost:3000,https://claude.ai
```

### Production Environment
```env
# .env.production
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

SONICWALL_HOST=${SONICWALL_HOST}
SONICWALL_USERNAME=${SONICWALL_USERNAME}
SONICWALL_PASSWORD=${SONICWALL_PASSWORD}
SONICWALL_VERSION=7

CACHE_TTL_SECONDS=300
API_TIMEOUT=30000
MAX_RETRIES=3

MCP_BEARER_TOKEN=${MCP_BEARER_TOKEN}
CORS_ORIGINS=https://claude.ai,https://your-domain.com

RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900
```

### High-Performance Environment  
```env
# .env.performance
NODE_ENV=production
LOG_LEVEL=warn
PORT=3000

SONICWALL_HOST=${SONICWALL_HOST}
SONICWALL_USERNAME=${SONICWALL_USERNAME} 
SONICWALL_PASSWORD=${SONICWALL_PASSWORD}
SONICWALL_VERSION=8

CACHE_TTL_SECONDS=600
CACHE_MAX_SIZE=5000
CACHE_CLEANUP_INTERVAL=30

API_TIMEOUT=15000
MAX_RETRIES=2
RETRY_DELAY=500

RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW=600
```

## Troubleshooting Configuration

### Common Issues

1. **Authentication Failed**
   - Check `SONICWALL_HOST`, `SONICWALL_USERNAME`, `SONICWALL_PASSWORD`
   - Verify API is enabled in SonicWall
   - Test with curl: `curl -k https://${SONICWALL_HOST}/api/sonicos/auth`

2. **CORS Errors**
   - Check `CORS_ORIGINS` setting
   - Ensure client origin is included
   - Verify HTTPS/HTTP protocol match

3. **Performance Issues**
   - Increase `CACHE_TTL_SECONDS`
   - Reduce `API_TIMEOUT` for faster failures
   - Adjust `CACHE_MAX_SIZE` based on available memory

4. **Memory Issues**
   - Reduce `CACHE_MAX_SIZE`
   - Lower `CACHE_TTL_SECONDS`
   - Implement request limits

### Configuration Testing

```bash
# Test configuration
docker-compose config

# Validate environment
docker-compose run sonicwall-mcp env | grep SONICWALL

# Test SonicWall connectivity
docker-compose run sonicwall-mcp curl -k https://${SONICWALL_HOST}/api/sonicos/auth
```

---

**💡 Pro Tip**: Start with default values and adjust based on your specific environment and performance requirements. Monitor logs and health metrics to optimize configuration over time.