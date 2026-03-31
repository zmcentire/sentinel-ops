import useSWR from 'swr';

export interface IncidentStats {
  open_count:      number;
  ack_count:       number;
  resolved_count:  number;
  avg_mttr_min:    number | null;
  avg_mttr_p1_min: number | null;
}

const BASE = (import.meta.env['VITE_API_URL'] as string) ?? '';
const fetcher = (url: string) => fetch(`${BASE}${url}`).then(r => r.json());

export function useIncidentStats() {
  const { data, isLoading } = useSWR<IncidentStats>(
    '/api/incidents/stats/summary',
    fetcher,
    { refreshInterval: 30_000 }
  );
  return { stats: data, isLoading };
}