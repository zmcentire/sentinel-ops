"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get broadcast () {
        return broadcast;
    },
    get initWss () {
        return initWss;
    }
});
const _ws = require("ws");
let wss = null;
function initWss(server) {
    wss = new _ws.WebSocketServer({
        server,
        path: '/ws/live'
    });
    wss.on('connection', (socket)=>{
        console.log('[ws] Client connected');
        // Heartbeat — keeps the connection alive through proxies and load balancers
        const ping = setInterval(()=>{
            if (socket.readyState === _ws.WebSocket.OPEN) {
                socket.ping();
            }
        }, 30_000);
        socket.on('error', (err)=>{
            console.error('[ws] Socket error:', err.message);
        });
        socket.on('close', ()=>{
            clearInterval(ping);
            console.log('[ws] Client disconnected');
        });
    });
    console.log('[ws] WebSocket server ready at /ws/live');
}
function broadcast(payload) {
    if (!wss) return;
    const data = JSON.stringify(payload);
    wss.clients.forEach((client)=>{
        if (client.readyState === _ws.WebSocket.OPEN) {
            client.send(data);
        }
    });
}
