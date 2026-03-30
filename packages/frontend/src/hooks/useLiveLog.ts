import { useEffect, useRef, useState } from 'react';

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
  const [log, setLog]   = useState<LogEntry[]>([]);
  const wsRef           = useRef<WebSocket | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function connect() {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws    = new WebSocket(`${proto}://${window.location.host}/ws/live`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const entry: LogEntry = JSON.parse(e.data);
          setLog(prev => [entry, ...prev].slice(0, maxEntries));
        } catch {}
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