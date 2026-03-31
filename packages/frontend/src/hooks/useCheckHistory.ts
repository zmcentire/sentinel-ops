import useSWR from 'swr';
import { API_BASE } from '../config';

export interface HistoryRow {
  bucket:       string;
  avg_latency:  number;
  p50:          number;
  p95:          number;
  p99:          number;
  total_checks: number;
  successes:    number;
  uptime_pct:   number;
  max_latency:  number;
}

const fetcher = (url: string) => fetch(`${API_BASE}${url}`).then(r => r.json());

export function useCheckHistory(endpointId: string | null, windowMin = 60) {
  const { data, isLoading } = useSWR<HistoryRow[]>(
    endpointId ? `/api/analytics/history/${endpointId}?window=${windowMin}` : null,
    fetcher,
    { refreshInterval: 30_000 }
  );
  return { history: data ?? [], isLoading };
}