import useSWR from 'swr';

export interface Endpoint {
  id:                string;
  name:              string;
  url:               string;
  method:            string;
  active:            boolean;
  interval_s:        number;
  timeout_ms:        number;
  latest_latency_ms: number | null;
  latest_success:    boolean | null;
  last_checked_at:   string | null;
}

const BASE = (import.meta.env['VITE_API_URL'] as string) ?? '';
const fetcher = (url: string) => fetch(`${BASE}${url}`).then(r => r.json());

export function useEndpoints() {
  const { data, error, isLoading, mutate } = useSWR<Endpoint[]>(
    '/api/endpoints',
    fetcher,
    { refreshInterval: 10_000 }
  );
  return { endpoints: data ?? [], isLoading, isError: !!error, refresh: mutate };
}