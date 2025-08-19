# Multi-stage build for optimal image size
# Use latest Node.js LTS with Alpine for minimal attack surface
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies)
# Use npm ci for faster, reliable, reproducible builds
RUN npm ci --ignore-scripts && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling and security updates
RUN apk add --no-cache dumb-init && \
    apk upgrade --no-cache

# Create non-root user with specific UID/GID for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install only production dependencies with security optimizations
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force && \
    npm audit fix --audit-level=moderate || true

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy environment example (optional)
COPY --chown=nodejs:nodejs .env.example ./

# Create necessary directories with proper permissions
RUN mkdir -p logs tmp && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]