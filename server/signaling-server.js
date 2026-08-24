// Minimal WebSocket signaling server for WebRTC
// Usage: npm install ws
// Run: node signaling-server.js

const WebSocket = require('ws');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });
console.log('Signaling server running on port', port);

// map clientId -> ws
const clients = new Map();
// map businessId -> clientId
const businessBindings = new Map();

wss.on('connection', (ws) => {
  let clientId = null;
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      if (!msg || !msg.type) return;
      if (msg.type === 'register' && msg.clientId) {
        clientId = msg.clientId;
        clients.set(clientId, ws);
        // ack
        ws.send(JSON.stringify({ type: 'registered', clientId }));
        return;
      }
      // bind business id to a client id so messages addressed to a business id are routed
      if (msg.type === 'bind-business' && msg.clientId && msg.businessId) {
        businessBindings.set(String(msg.businessId), String(msg.clientId));
        // ack
        ws.send(JSON.stringify({ type: 'bound', businessId: msg.businessId, clientId: msg.clientId }));
        return;
      }
      // forward to target if provided
      const to = msg.to;
      if (to) {
        // direct clientId
        if (clients.has(String(to))) {
          const target = clients.get(String(to));
          try { target.send(JSON.stringify(msg)); } catch(e){}
          return;
        }
        // businessId mapped to clientId
        if (businessBindings.has(String(to))) {
          const mappedClient = businessBindings.get(String(to));
          if (clients.has(mappedClient)) {
            const target = clients.get(mappedClient);
            try { target.send(JSON.stringify(msg)); } catch(e){}
          }
          return;
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  });
  ws.on('close', () => {
    if (clientId) clients.delete(clientId);
  });
});
