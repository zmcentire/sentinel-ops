import useSWR, { mutate } from 'swr';

interface Incident {
  id:            string;
  endpoint_name: string;
  severity:      'p1' | 'p2' | 'p3';
  title:         string;
  status:        string;
  opened_at:     string;
  mttr_minutes:  number | null;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());
const API = '/api/incidents';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function IncidentTimeline() {
  const { data: incidents = [] } = useSWR<Incident[]>(API, fetcher, { refreshInterval: 15_000 });

  const transition = async (id: string, action: 'acknowledge' | 'resolve') => {
    await fetch(`${API}/${id}/${action}`, { method: 'PATCH' });
    mutate(API);
  };

  return (
    <>
      <div className="panel-header">
        <span className={`blink-dot ${incidents.some(i => i.status === 'open') ? 'red' : ''}`} />
        INCIDENTS
        <span className="panel-header-right">{incidents.filter(i => i.status !== 'resolved').length} ACTIVE</span>
      </div>
      <div className="incident-list">
        {incidents.length === 0 && (
          <div className="no-incidents">ALL SYSTEMS NOMINAL</div>
        )}
        {incidents.map(inc => (
          <div key={inc.id} className={`incident-card ${inc.severity}`}>
            <div className="inc-header">
              <span className={`sev-badge sev-${inc.severity}`}>{inc.severity.toUpperCase()}</span>
              <span className="inc-title">{inc.title}</span>
            </div>
            <div className="inc-ep">{inc.endpoint_name}</div>
            <div className="inc-meta">
              <span className="inc-age">{timeAgo(inc.opened_at)}</span>
              <span className={`inc-status-${inc.status}`}>{inc.status.toUpperCase()}</span>
            </div>
            <div className="inc-actions">
              {inc.status === 'open' && (
                <button className="btn-ack" onClick={() => transition(inc.id, 'acknowledge')}>ACK</button>
              )}
              {inc.status !== 'resolved' && (
                <button className="btn-resolve" onClick={() => transition(inc.id, 'resolve')}>RESOLVE</button>
              )}
              {inc.status === 'resolved' && inc.mttr_minutes !== null && (
                <span className="mttr-badge">MTTR {Math.round(inc.mttr_minutes)}m</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}