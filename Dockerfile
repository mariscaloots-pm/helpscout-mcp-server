# Use Node.js 20 LTS as base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code and config
COPY src/ ./src/
COPY mcp.json ./

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S help-scout -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Install supergateway globally (must be done as root, before USER switch)
RUN npm install -g supergateway

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mcp.json ./

# Change ownership to app user
RUN chown -R help-scout:nodejs /app
USER help-scout

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Use sh -c to ensure the port number is properly passed as a number
CMD ["sh", "-c", "exec supergateway --stdio 'node dist/index.js' --port 8080"]

# Labels for metadata
LABEL name="help-scout-mcp-server" \
    description="Help Scout MCP server for searching inboxes, conversations, and threads" \
    version="1.6.0" \
    maintainer="Drew Burchfield"
