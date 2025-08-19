# Troubleshooting Guide

Comprehensive troubleshooting guide for the SonicWall MCP Server, covering common issues, diagnostic procedures, and solutions.

## 🚀 Version 1.0.0 Troubleshooting Updates

### SonicOS Version-Specific Issues
The server now includes enhanced diagnostics for both SonicOS 7.x and 8.x endpoints:

- **Endpoint Validation**: Automatic detection of correct API endpoints
- **Version Mismatch Detection**: Clear error messages for configuration issues
- **Enhanced Error Reporting**: Detailed SonicWall API error codes and solutions
- **Session Management**: Improved authentication troubleshooting for SonicOS 8.x

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Connection Issues](#connection-issues)  
- [Authentication Problems](#authentication-problems)
- [Performance Issues](#performance-issues)
- [MCP Protocol Issues](#mcp-protocol-issues)
- [Docker Issues](#docker-issues)
- [Log Analysis](#log-analysis)
- [Advanced Diagnostics](#advanced-diagnostics)

## Quick Diagnosis

### Health Check Commands

Start with these basic diagnostic commands:

```bash
# 1. Check server status
curl http://localhost:3000/health

# 2. Check MCP endpoint
curl -H "Accept: text/event-stream" http://localhost:3000/mcp/v1/sse

# 3. View server logs
docker compose logs sonicwall-mcp

# 4. Check container status
docker compose ps
```

### Expected Responses

**Healthy Server:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0", 
  "protocol": "MCP/2024-11-05",
  "sonicwall": {
    "connected": true,
    "version": "SonicOS 7.x",
    "endpoints": "accurate",
    "apiCompliance": "full"
  },
  "cache": {
    "hitRatio": 85.3,
    "size": 234
  }
}
```

**MCP SSE Response:**
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

## SonicOS Version Issues

### ❌ Wrong API Endpoints

**Problem**: Server configured for wrong SonicOS version

**Symptoms**:
```
ERROR: Endpoint '/api/sonicos/v8/auth' not available in SonicOS 7.x
ERROR: Authentication failed: HTTP 404 - Endpoint not found
```

**Solution**:
```env
# Check your SonicOS version in: SYSTEM > Settings > Version
# Update configuration accordingly:
SONICWALL_VERSION=7  # For SonicOS 7.x
SONICWALL_VERSION=8  # For SonicOS 8.x

# Restart server after changing version
docker compose restart
```

### ❌ SonicOS 8.x Session Issues

**Problem**: Session management problems with SonicOS 8.x

**Symptoms**:
```
WARN: Session ID missing for SonicOS 8.x request
ERROR: X-Session-ID header required for SonicOS 8.x
```

**Solution**:
```bash
# Verify SonicOS 8.x is properly configured
# The server automatically handles session management
# Check logs for detailed session information:
docker compose logs sonicwall-mcp | grep "Session ID"
```

### ❌ Feature Not Available

**Problem**: Using SonicOS 8.x features on 7.x system

**Symptoms**:
```
ERROR: Cloud management status is only available in SonicOS 8.x
ERROR: Advanced threat protection stats may not be fully available in SonicOS 7.x
```

**Solution**:
- Verify your SonicOS version supports the requested feature
- Some features are version-specific and will gracefully degrade
- Check feature availability in server logs

## Connection Issues

### ❌ "Connection Refused" or "ECONNREFUSED"

**Symptoms:**
- Cannot reach SonicWall device
- Timeout errors
- Network unreachable

**Diagnosis:**
```bash
# Test basic connectivity
ping $SONICWALL_HOST

# Test HTTPS port
telnet $SONICWALL_HOST 443
# or
nmap -p 443 $SONICWALL_HOST

# Test from container
docker compose exec sonicwall-mcp ping $SONICWALL_HOST
```

**Solutions:**

1. **Network Connectivity**
   ```bash
   # Check routing
   traceroute $SONICWALL_HOST
   
   # Check DNS resolution
   nslookup $SONICWALL_HOST
   ```

2. **Firewall Rules**
   - Ensure HTTPS (port 443) is allowed
   - Check both host and SonicWall firewall rules
   - Verify VPN connectivity if SonicWall is remote

3. **Container Networking**
   ```yaml
   # docker compose.yml
   version: '3.8'
   services:
     sonicwall-mcp:
       network_mode: "host"  # Use host networking
       # or
       extra_hosts:
         - "firewall.local:192.168.1.1"
   ```

### ❌ "SSL Certificate Error" or "CERT_UNTRUSTED"

**Symptoms:**
- SSL handshake failures
- Certificate validation errors

**Solutions:**

1. **Allow Self-Signed Certificates** (Default behavior):
   ```env
   # The server already accepts self-signed certificates
   SONICWALL_IGNORE_SSL_ERRORS=true
   ```

2. **Custom CA Certificate**:
   ```bash
   # Add custom CA certificate
   export NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.pem
   ```

3. **Test SSL Connection**:
   ```bash
   # Check certificate details
   openssl s_client -connect $SONICWALL_HOST:443 -servername $SONICWALL_HOST
   
   # Test with curl
   curl -k -v https://$SONICWALL_HOST/api/sonicos/auth
   ```

## Authentication Problems

### ❌ "Authentication Failed" or "401 Unauthorized"

**Symptoms:**
- Invalid credentials errors
- 401 HTTP responses
- "Access denied" messages

**Diagnosis:**
```bash
# Test credentials manually
curl -k -X POST https://$SONICWALL_HOST/api/sonicos/auth \
  -H "Content-Type: application/json" \
  -d "{\"user\":\"$SONICWALL_USERNAME\",\"password\":\"$SONICWALL_PASSWORD\"}"

# Expected success response:
# {"token":"abc123...","expires_in":3600}
```

**Solutions:**

1. **Check Credentials**
   ```bash
   # Verify environment variables
   echo $SONICWALL_USERNAME
   echo $SONICWALL_PASSWORD  # Be careful with this in logs
   
   # Test login via SonicWall web interface
   # Navigate to https://$SONICWALL_HOST
   ```

2. **API Access Configuration**
   - Navigate to: **MANAGE** → **System Setup** → **Appliance** → **Base Settings**
   - Locate **SonicOS API** section
   - Ensure API is enabled with proper authentication method:
     - ✅ **RFC 2617 HTTP Basic Access Authentication**
     - ✅ **CHAP Authentication and RFC 2617 HTTP Basic Access**

3. **User Permissions**
   ```bash
   # Check user has admin privileges
   # Admin users required for API access
   ```

4. **Account Lockout**
   - Check if admin account is locked due to failed attempts
   - Reset from console or another admin account
   - Wait for lockout timer to expire

### ❌ "Token Expired" or Session Issues

**Symptoms:**
- Initial authentication succeeds, later requests fail
- Intermittent 401 errors

**Solutions:**

1. **Token Refresh Logic** (Already implemented):
   ```typescript
   // Automatic token refresh is built-in
   // No manual intervention required
   ```

2. **Check Token Expiration**:
   ```bash
   # View server logs for token refresh events
   docker compose logs sonicwall-mcp | grep -i "token\|auth"
   ```

## Performance Issues

### ❌ "Request Timeout" or Slow Responses

**Symptoms:**
- Long response times (>30 seconds)
- Timeout errors
- Poor user experience

**Diagnosis:**
```bash
# Check response times
time curl http://localhost:3000/health

# Monitor server performance
docker stats sonicwall-mcp

# Check SonicWall device load
# Access SonicWall dashboard for CPU/memory usage
```

**Solutions:**

1. **Increase Timeouts**
   ```env
   # Increase API timeout
   API_TIMEOUT=60000  # 60 seconds
   
   # Increase retries
   MAX_RETRIES=5
   ```

2. **Optimize Cache Settings**
   ```env
   # Increase cache TTL
   CACHE_TTL_SECONDS=600  # 10 minutes
   
   # Increase cache size
   CACHE_MAX_SIZE=2000
   ```

3. **Limit Query Scope**
   ```javascript
   // Use shorter time ranges
   {
     "hoursBack": 6  // Instead of 24 or 168
   }
   
   // Limit results
   {
     "limit": 100  // Instead of 1000+
   }
   ```

### ❌ High Memory Usage

**Symptoms:**
- Container consuming >500MB RAM
- Out of memory errors
- System slowdown

**Diagnosis:**
```bash
# Check memory usage
docker stats sonicwall-mcp

# Check Node.js heap usage
curl http://localhost:3000/health | jq '.memory'
```

**Solutions:**

1. **Reduce Cache Size**
   ```env
   CACHE_MAX_SIZE=500
   CACHE_TTL_SECONDS=180
   ```

2. **Memory Limits**
   ```yaml
   # docker compose.yml
   services:
     sonicwall-mcp:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

3. **Query Optimization**
   ```javascript
   // Avoid large exports
   {
     "limit": 1000  // Instead of 50000
   }
   ```

## MCP Protocol Issues

### ❌ "MCP Connection Failed" or CORS Errors

**Symptoms:**
- Claude Desktop cannot connect
- CORS policy errors in browser
- SSE connection failures

**Diagnosis:**
```bash
# Test SSE endpoint
curl -H "Accept: text/event-stream" \
     -H "Origin: https://claude.ai" \
     http://localhost:3000/mcp/v1/sse

# Check CORS headers
curl -I -H "Origin: https://claude.ai" \
     http://localhost:3000/mcp/v1/sse
```

**Solutions:**

1. **CORS Configuration**
   ```env
   # Allow Claude.ai
   CORS_ORIGINS=https://claude.ai,https://www.claude.ai,http://localhost:3000
   ```

2. **Claude Desktop Configuration**
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

3. **Network Accessibility**
   ```bash
   # Ensure server is accessible from Claude
   # Check localhost vs. 0.0.0.0 binding
   netstat -tlnp | grep 3000
   ```

### ❌ "Schema Validation Failed"

**Symptoms:**
- Tool calls return validation errors
- Parameter format errors

**Diagnosis:**
```bash
# Check tool schemas
curl http://localhost:3000/health

# View validation errors in logs
docker compose logs sonicwall-mcp | grep -i "validation\|schema"
```

**Solutions:**

1. **Parameter Format**
   ```javascript
   // ✅ Correct IP format
   {
     "sourceIp": "192.168.1.1"
   }
   
   // ❌ Incorrect format
   {
     "sourceIp": "invalid-ip"
   }
   ```

2. **Time Format**
   ```javascript
   // ✅ Correct ISO 8601 format
   {
     "startTime": "2024-01-01T00:00:00Z"
   }
   
   // ❌ Incorrect format
   {
     "startTime": "2024-01-01"
   }
   ```

## Docker Issues

### ❌ Container Won't Start

**Symptoms:**
- Container exits immediately
- "No such file or directory" errors
- Permission denied errors

**Diagnosis:**
```bash
# Check container logs
docker compose logs sonicwall-mcp

# Check container status
docker compose ps

# Inspect container
docker compose exec sonicwall-mcp ls -la /app
```

**Solutions:**

1. **Build Issues**
   ```bash
   # Rebuild container
   docker compose build --no-cache
   
   # Clear Docker cache
   docker system prune -a
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   chmod +x scripts/*
   
   # Check file ownership
   ls -la
   ```

3. **Environment Variables**
   ```bash
   # Check .env file exists
   cat .env
   
   # Verify variables are loaded
   docker compose config
   ```

### ❌ "Cannot Connect to Docker Daemon"

**Solutions:**
```bash
# Start Docker service
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Check Docker status
systemctl status docker
```

## Log Analysis

### Analyzing Server Logs

**View Real-time Logs:**
```bash
# Follow all logs
docker compose logs -f

# Filter by service
docker compose logs -f sonicwall-mcp

# Filter by level
docker compose logs sonicwall-mcp | grep ERROR
docker compose logs sonicwall-mcp | grep WARN
```

### Common Log Patterns

**Authentication Logs:**
```bash
# Successful authentication
grep "Successfully authenticated" logs/

# Authentication failures
grep "Authentication failed" logs/
```

**Performance Logs:**
```bash
# Slow queries
grep "execution time" logs/ | awk '$NF > 5000'

# Cache statistics
grep "cache" logs/
```

**Error Logs:**
```bash
# API errors
grep "API request failed" logs/

# Connection errors
grep -i "econnrefused\|timeout\|enotfound" logs/
```

### Log Levels

**ERROR**: Critical issues requiring immediate attention
```
{"level":"error","message":"SonicWall API authentication failed","error":"Connection refused"}
```

**WARN**: Issues that don't prevent operation
```
{"level":"warn","message":"Cache miss for key: logs:query123","performance":true}
```

**INFO**: Normal operational events
```
{"level":"info","message":"Tool analyze_logs executed successfully","executionTime":245}
```

**DEBUG**: Detailed diagnostic information
```
{"level":"debug","message":"SonicWall API request","endpoint":"/api/sonicos/reporting/log-monitor"}
```

## Advanced Diagnostics

### Network Debugging

**Packet Capture:**
```bash
# Capture traffic to SonicWall
sudo tcpdump -i any host $SONICWALL_HOST and port 443

# Monitor HTTP traffic
sudo tcpdump -i any port 3000 -A
```

**DNS Resolution:**
```bash
# Test DNS resolution
nslookup $SONICWALL_HOST
dig $SONICWALL_HOST

# Test from container
docker compose exec sonicwall-mcp nslookup $SONICWALL_HOST
```

### Performance Profiling

**Memory Analysis:**
```bash
# Node.js memory usage
node --inspect server.js
# Connect to Chrome DevTools for profiling
```

**Database Query Analysis:**
```bash
# Monitor SonicWall API calls
grep "SonicWall API request" logs/ | wc -l

# Average response time
grep "API response time" logs/ | awk '{sum+=$NF; count++} END {print sum/count}'
```

### Health Check Debugging

**Custom Health Checks:**
```bash
# Check specific functionality
curl http://localhost:3000/health/detailed

# Test individual components
curl http://localhost:3000/health/sonicwall
curl http://localhost:3000/health/cache
curl http://localhost:3000/health/mcp
```

## Diagnostic Scripts

### All-in-One Diagnostic

```bash
#!/bin/bash
# diagnostic.sh - Comprehensive diagnostic script

echo "=== SonicWall MCP Server Diagnostics ==="

echo "1. Server Status:"
curl -s http://localhost:3000/health | jq '.' || echo "Server not responding"

echo -e "\n2. Container Status:"
docker compose ps

echo -e "\n3. SonicWall Connectivity:"
curl -k -s --connect-timeout 5 https://$SONICWALL_HOST/api/sonicos/auth || echo "Cannot reach SonicWall"

echo -e "\n4. MCP Endpoint:"
curl -s -H "Accept: text/event-stream" http://localhost:3000/mcp/v1/sse | head -1

echo -e "\n5. Recent Errors:"
docker compose logs sonicwall-mcp | grep ERROR | tail -5

echo -e "\n6. Memory Usage:"
docker stats sonicwall-mcp --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo -e "\n7. Environment Check:"
docker compose exec sonicwall-mcp env | grep -E "SONICWALL_HOST|SONICWALL_VERSION|NODE_ENV"
```

### Performance Test Script

```bash
#!/bin/bash
# performance-test.sh - Test server performance

echo "=== Performance Test ==="

echo "Testing health endpoint..."
time curl -s http://localhost:3000/health > /dev/null

echo "Testing analyze_logs tool..."
time curl -s -X POST http://localhost:3000/test/analyze \
  -H "Content-Type: application/json" \
  -d '{"query":"show recent blocked connections","hoursBack":1}' > /dev/null

echo "Testing cache performance..."
for i in {1..5}; do
  echo "Request $i:"
  time curl -s http://localhost:3000/health > /dev/null
done
```

## Support and Escalation

### When to Escalate

1. **Security Issues**: Authentication bypasses, data leaks
2. **Data Integrity**: Incorrect log parsing, missing data
3. **Performance**: Consistent timeouts, memory leaks
4. **Protocol Issues**: MCP compliance problems

### Information to Collect

Before reporting issues, collect:

1. **Server logs**:
   ```bash
   docker compose logs sonicwall-mcp > server-logs.txt
   ```

2. **Configuration**:
   ```bash
   docker compose config > config.yml
   env | grep SONICWALL > env-vars.txt
   ```

3. **System information**:
   ```bash
   docker version > docker-info.txt
   docker compose version >> docker-info.txt
   uname -a > system-info.txt
   ```

4. **Network diagnostics**:
   ```bash
   ping $SONICWALL_HOST > network-test.txt
   curl -k -v https://$SONICWALL_HOST/api/sonicos/auth >> network-test.txt 2>&1
   ```

### Contact Information

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-org/sonicwall-mcp-server/issues)
- 💬 **Community Support**: [GitHub Discussions](https://github.com/your-org/sonicwall-mcp-server/discussions)
- 📧 **Security Issues**: security@yourorganization.com
- 📚 **Documentation**: [Project Wiki](https://github.com/your-org/sonicwall-mcp-server/wiki)

---

**💡 Pro Tip**: Most issues can be resolved by checking the server logs first. Use `docker compose logs -f sonicwall-mcp` to monitor real-time logs while testing functionality.