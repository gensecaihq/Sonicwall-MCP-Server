# Docker Quick Reference

## Commands Cheat Sheet

### Production Deployment
```bash
# Start services (detached)
docker compose up -d

# Start with rebuild
docker compose up --build -d

# Stop services
docker compose down

# View logs (follow)
docker compose logs -f sonicwall-mcp

# Restart services
docker compose restart

# Check service status
docker compose ps
```

### Development
```bash
# Start development mode (with hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Start development in background
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Use npm shortcut
npm run docker:dev
```

### NPM Script Shortcuts
```bash
npm run docker:up      # Production deployment
npm run docker:down    # Stop all services
npm run docker:dev     # Development mode
npm run docker:logs    # View logs
npm run docker:build   # Build image only
```

### Environment Setup
```bash
# Copy example environment
cp .env.example .env

# Edit environment variables
nano .env

# Start with environment file
docker compose up -d

# Or set variables inline
SONICWALL_HOST=192.168.1.1 docker compose up -d
```

### Troubleshooting
```bash
# View service logs
docker compose logs sonicwall-mcp

# Follow logs in real-time
docker compose logs -f sonicwall-mcp

# Execute command in container
docker compose exec sonicwall-mcp sh

# Validate configuration
docker compose config

# Rebuild without cache
docker compose build --no-cache

# Check resource usage
docker compose top
```

### File Structure
- `docker-compose.yml` - Production configuration
- `docker-compose.dev.yml` - Development overrides  
- `docker-compose.override.yml` - Local customizations (optional)
- `.env` - Environment variables (create from .env.example)

### Requirements
- Docker Engine 20.10+
- Docker Compose V2 (included with Docker Desktop)

### Port Mapping
- `3000` - MCP Server HTTP/SSE endpoint
- `9229` - Node.js debug port (development only)

### Health Check
```bash
# Check if server is running
curl http://localhost:3000/health

# Expected response
{"status":"healthy","protocol":"MCP/2025-06-18","version":"1.0.0"}
```