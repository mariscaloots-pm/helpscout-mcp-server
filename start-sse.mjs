import { stdioToSse } from 'supergateway/dist/gateways/stdioToSse.js';
import { getLogger } from 'supergateway/dist/lib/getLogger.js';

const logger = getLogger({ logLevel: 'info', outputTransport: 'sse' });

await stdioToSse({
  stdioCmd: 'node dist/index.js',
  port: 8080,
  baseUrl: '',
  ssePath: '/sse',
  messagePath: '/message',
  logger: logger,
  corsOrigin: '*',
  healthEndpoints: ['/health'],
  headers: [],
});
```

Click **Commit changes**.

---

**Step 2: Update the last line of the Dockerfile**

Open `Dockerfile`, click the pencil icon to edit, and find this line near the bottom:
```
CMD ["sh", "-c", "exec supergateway --stdio 'node dist/index.js' --port 8080"]
```

Replace it with:
```
CMD ["node", "start-sse.mjs"]
```

Also find the line that says `COPY --from=builder /app/mcp.json ./` and right **below** it, add this new line:
```
COPY start-sse.mjs ./
