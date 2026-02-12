import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const PORT = 8080;
const sessions = new Map();

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const httpServer = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }

  if (req.method === 'GET' && req.url === '/sse') {
    const sessionId = randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const child = spawn('node', ['dist/index.js'], {
      env: process.env,
      stdio: ['pipe', 'pipe', 'inherit'],
      cwd: process.cwd(),
    });

    let buffer = '';
    child.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          res.write('event: message\ndata: ' + line + '\n\n');
        }
      }
    });

    child.on('error', (err) => {
      console.error('Child process error: ' + err.message);
      sessions.delete(sessionId);
      if (!res.writableEnded) res.end();
    });

    child.on('close', (code) => {
      console.log('MCP process exited with code ' + code);
      sessions.delete(sessionId);
      if (!res.writableEnded) res.end();
    });

    req.on('close', () => {
      child.kill();
      sessions.delete(sessionId);
    });

    sessions.set(sessionId, { res, child });
    res.write('event: endpoint\ndata: /message?sessionId=' + sessionId + '\n\n');
    console.log('New SSE session: ' + sessionId);
    return;
  }

  if (req.method === 'POST' && req.url && req.url.startsWith('/message')) {
    const url = new URL(req.url, 'http://localhost:' + PORT);
    const sessionId = url.searchParams.get('sessionId');
    const session = sessions.get(sessionId);

    if (!session) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Session not found');
    }

    const body = await parseBody(req);
    session.child.stdin.write(body + '\n');
    res.writeHead(202, { 'Content-Type': 'text/plain' });
    return res.end('Accepted');
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('SSE Bridge listening on port ' + PORT);
  console.log('SSE endpoint: http://0.0.0.0:' + PORT + '/sse');
  console.log('Health endpoint: http://0.0.0.0:' + PORT + '/health');
});

process.on('SIGTERM', () => {
  for (const [, s] of sessions) s.child.kill();
  httpServer.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  for (const [, s] of sessions) s.child.kill();
  httpServer.close(() => process.exit(0));
});
