import { useState } from 'react';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Incidents() {
  const [statusFilter,   setStatusFilter]   = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const params = new URLSearchParams();
  if (statusFilter)   params.set('status',   statusFilter);
  if (severityFilter) params.set('severity', severityFilter);

  const url = `/api/incidents?${params.toString()}&limit=100`;
  const { data: incidents = [] } = useSWR(url, fetcher, { refreshInterval: 15_000 });

  const transition = async (id: string, action: 'acknowledge' | 'resolve') => {
    await fetch(`/api/incidents/${id}/${action}`, { method: 'PATCH' });
    mutate(url);
  };

  return (
    <div className="incidents-page">
      <h1>INCIDENT LOG</h1>

      <div className="incidents-filters">
        {/* Status filters */}
        {['', 'open', 'acknowledged', 'resolved'].map(s => (
          <button
            key={s}
            className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === '' ? 'ALL STATUS' : s.toUpperCase()}
          </button>
        ))}
        <span style={{ width: 16 }} />
        {/* Severity filters */}
        {['', 'p1', 'p2', 'p3'].map(s => (
          <button
            key={s}
            className={`filter-btn ${severityFilter === s ? 'active' : ''}`}
            onClick={() => setSeverityFilter(s)}
          >
            {s === '' ? 'ALL SEV' : s.toUpperCase()}
          </button>
        ))}
      </div>

      <table className="incidents-table">
        <thead>
          <tr>
            <th>SEV</th>
            <th>TITLE</th>
            <th>ENDPOINT</th>
            <th>OPENED</th>
            <th>STATUS</th>
            <th>MTTR</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc: any) => (
            <tr key={inc.id}>
              <td><span className={`sev-badge sev-${inc.severity}`}>{inc.severity.toUpperCase()}</span></td>
              <td style={{ color: 'var(--text-0)', maxWidth: 280 }}>{inc.title}</td>
              <td style={{ color: 'var(--text-2)' }}>{inc.endpoint_name ?? '—'}</td>
              <td className="text-muted">{timeAgo(inc.opened_at)}</td>
              <td>
                <span className={`inc-status-${inc.status}`}>
                  {inc.status.toUpperCase()}
                </span>
              </td>
              <td className="text-muted">
                {inc.mttr_minutes != null ? `${Math.round(inc.mttr_minutes)}m` : '—'}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  {inc.status === 'open' && (
                    <button className="btn-ack" onClick={() => transition(inc.id, 'acknowledge')}>ACK</button>
                  )}
                  {inc.status !== 'resolved' && (
                    <button className="btn-resolve" onClick={() => transition(inc.id, 'resolve')}>RESOLVE</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {incidents.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px' }}>
                NO INCIDENTS MATCH FILTER
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}