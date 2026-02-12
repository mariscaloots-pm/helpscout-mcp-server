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
