export const API_BASE = import.meta.env.VITE_API_URL 
  || 'https://api-production-7ea8.up.railway.app';

export const WS_BASE = API_BASE
  .replace('https://', 'wss://')
  .replace('http://',  'ws://');
