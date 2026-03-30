import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;

export function initWss(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws/live' });

  wss.on('connection', (socket) => {
    console.log('[ws] Client connected');

    // Heartbeat — keeps the connection alive through proxies and load balancers
    const ping = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      }
    }, 30_000);

    socket.on('error', (err) => {
      console.error('[ws] Socket error:', err.message);
    });

    socket.on('close', () => {
      clearInterval(ping);
      console.log('[ws] Client disconnected');
    });
  });

  console.log('[ws] WebSocket server ready at /ws/live');
}

export function broadcast(payload: object): void {
  if (!wss) return;

  const data = JSON.stringify(payload);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}