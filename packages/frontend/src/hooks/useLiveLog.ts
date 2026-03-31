import { useEffect, useRef, useState } from 'react';
import { WS_BASE } from '../config';

export interface LogEntry {
  type:       string;
  endpointId: string;
  name:       string;
  latencyMs:  number;
  success:    boolean;
  statusCode: number | null;
  errorMsg:   string | null;
  timestamp:  string;
}

export function useLiveLog(maxEntries = 120) {
  const [log, setLog]        = useState<LogEntry[]>([]);
  const wsRef                = useRef<WebSocket | null>(null);
  const reconnectRef         = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function connect() {
      const apiUrl = import.meta.env.VITE_API_URL ?? '';
      const wsUrl  = apiUrl
        .replace('https://', 'wss://')
        .replace('http://',  'ws://');
       const ws = new WebSocket(`${WS_BASE}/ws/live`);
       wsRef.current = ws;

      ws.onmessage = (e: MessageEvent) => {
        try {
          const entry = JSON.parse(e.data as string) as LogEntry;
          setLog(prev => [entry, ...prev].slice(0, maxEntries));
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [maxEntries]);

  return log;
}