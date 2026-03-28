import { getEnvConfig } from '@deal-coordinator/config';

const config = getEnvConfig();
const API_URL = config.apiUrl;

console.log(`[Gateway] Starting in ${config.appEnv} environment`);
console.log(`[Gateway] API target: ${API_URL}`);

// Phase 1: Simple HTTP server that forwards chat webhooks to the API
// Phase 2: OpenClaw adapter, webhook signature verification, rate limiting

import { createServer } from 'http';

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/webhook/chat') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const response = await fetch(`${API_URL}/api/chat/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': payload.workspaceId || '',
            'x-user-id': payload.senderId || '',
          },
          body: JSON.stringify({
            message: payload.message,
            senderId: payload.senderId,
            senderName: payload.senderName || 'Unknown',
            channelId: payload.channelId,
            dealId: payload.dealId,
          }),
        });
        const result = await response.json();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: { code: 'GATEWAY_ERROR', message: 'Failed to process webhook' },
          }),
        );
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'gateway' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
  }
});

const port = parseInt(process.env.GATEWAY_PORT || '3003', 10);
server.listen(port, () => {
  console.log(`[Gateway] Listening on port ${port}`);
});
