import { useState } from 'react';
import { useEndpoints } from '../hooks/useEndpoints';

export function Endpoints() {
  const { endpoints, refresh } = useEndpoints();
  const [name,      setName]      = useState('');
  const [url,       setUrl]       = useState('');
  const [method,    setMethod]    = useState('GET');
  const [interval,  setInterval]  = useState('60');
  const [error,     setError]     = useState('');

  const addEndpoint = async () => {
    if (!name || !url) { setError('Name and URL are required'); return; }
    setError('');
    const res = await fetch('/api/endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, method, interval_s: Number(interval) }),
    });
    if (res.ok) {
      setName(''); setUrl('');
      refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to add endpoint');
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/endpoints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    refresh();
  };

  const deleteEndpoint = async (id: string) => {
    if (!confirm('Delete this endpoint and all its check history?')) return;
    await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="endpoints-page">
      <h1>MONITORED ENDPOINTS</h1>

      <div className="add-endpoint-form">
        <div className="form-field">
          <label className="form-label">Name</label>
          <input className="form-input" placeholder="auth-service" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">URL</label>
          <input className="form-input" style={{ minWidth: 280 }} placeholder="https://api.example.com/health" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">Method</label>
          <select className="form-input" style={{ minWidth: 80 }} value={method} onChange={e => setMethod(e.target.value)}>
            {['GET','POST','PUT','HEAD'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Interval (s)</label>
          <input className="form-input" style={{ minWidth: 80 }} type="number" value={interval} onChange={e => setInterval(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={addEndpoint}>+ ADD ENDPOINT</button>
        {error && <span className="rule-error">{error}</span>}
      </div>

      <table className="endpoints-table">
        <thead>
          <tr>
            <th>STATUS</th>
            <th>NAME</th>
            <th>URL</th>
            <th>METHOD</th>
            <th>INTERVAL</th>
            <th>LATENCY</th>
            <th>ACTIVE</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map(ep => (
            <tr key={ep.id}>
              <td>
                <span className={`status-dot ${
                  ep.latest_success === null  ? 'dot-unknown' :
                  ep.latest_success           ? 'dot-ok'      : 'dot-error'
                }`} style={{ display: 'inline-block' }} />
              </td>
              <td style={{ color: 'var(--text-0)', fontWeight: 500 }}>{ep.name}</td>
              <td style={{ color: 'var(--text-2)', fontSize: 10 }}>{ep.url}</td>
              <td>{ep.method}</td>
              <td>{ep.interval_s}s</td>
              <td className={ep.latest_latency_ms !== null ? 'text-warn' : 'text-muted'}>
                {ep.latest_latency_ms !== null ? `${ep.latest_latency_ms}ms` : '—'}
              </td>
              <td>
                <button
                  className={`toggle-active ${ep.active ? 'on' : ''}`}
                  onClick={() => toggleActive(ep.id, ep.active)}
                >
                  {ep.active ? 'ACTIVE' : 'PAUSED'}
                </button>
              </td>
              <td>
                <button className="btn-delete" onClick={() => deleteEndpoint(ep.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}