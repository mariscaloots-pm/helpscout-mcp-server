FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci && npm cache clean --force
COPY src/ ./src/
COPY mcp.json ./
RUN npm run build

FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S help-scout -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
RUN npm install -g supergateway
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mcp.json ./
RUN printf '#!/bin/sh\nexec supergateway --stdio "node dist/index.js" --port 8080\n' > /app/start.sh && chmod +x /app/start.sh
RUN chown -R help-scout:nodejs /app
USER help-scout
EXPOSE 8080
CMD ["/app/start.sh"]
