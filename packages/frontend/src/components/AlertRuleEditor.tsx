import { useState } from 'react';
import useSWR, { mutate } from 'swr';

interface Props { endpointId: string; }

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function AlertRuleEditor({ endpointId }: Props) {
  const rulesUrl = `/api/endpoints/${endpointId}/rules`;
  const { data: rules = [] } = useSWR(rulesUrl, fetcher);

  const [metric,    setMetric]    = useState('latency_p99');
  const [operator,  setOperator]  = useState('gt');
  const [threshold, setThreshold] = useState('');
  const [windowMin, setWindowMin] = useState('5');
  const [severity,  setSeverity]  = useState('p2');
  const [notifySms, setNotifySms] = useState(false);
  const [error,     setError]     = useState('');

  const submit = async () => {
    if (!threshold || isNaN(Number(threshold))) {
      setError('Threshold must be a number');
      return;
    }
    setError('');
    await fetch(rulesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric, operator,
        threshold:    Number(threshold),
        window_min:   Number(windowMin),
        severity,
        notify_sms:   notifySms,
        notify_email: true,
      }),
    });
    mutate(rulesUrl);
    setThreshold('');
  };

  const deleteRule = async (id: string) => {
    await fetch(`${rulesUrl}/${id}`, { method: 'DELETE' });
    mutate(rulesUrl);
  };

  return (
    <div className="rule-editor">
      <div className="rule-form">
        <select value={metric} onChange={e => setMetric(e.target.value)}>
          <option value="latency_p99">P99 Latency (ms)</option>
          <option value="uptime_pct">Uptime %</option>
          <option value="error_rate">Error Rate %</option>
        </select>
        <select value={operator} onChange={e => setOperator(e.target.value)}>
          <option value="gt">above</option>
          <option value="lt">below</option>
        </select>
        <input
          type="number"
          placeholder="threshold"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
        />
        <select value={windowMin} onChange={e => setWindowMin(e.target.value)}>
          {[1, 5, 10, 15, 30].map(n => (
            <option key={n} value={n}>over {n}m</option>
          ))}
        </select>
        <select value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="p1">P1</option>
          <option value="p2">P2</option>
          <option value="p3">P3</option>
        </select>
        <label>
          <input type="checkbox" checked={notifySms} onChange={e => setNotifySms(e.target.checked)} />
          SMS
        </label>
        <button className="btn-add-rule" onClick={submit}>+ ADD RULE</button>
        {error && <span className="rule-error">{error}</span>}
      </div>

      <div className="rule-list">
        {rules.map((r: any) => (
          <div key={r.id} className="rule-row">
            <span style={{ color: 'var(--text-0)' }}>{r.metric}</span>
            <span style={{ color: 'var(--text-2)' }}>{r.operator === 'gt' ? '>' : '<'} {r.threshold}</span>
            <span style={{ color: 'var(--text-2)' }}>over {r.window_min}m</span>
            <span className={`sev-chip ${r.severity}`}>{r.severity.toUpperCase()}</span>
            <button className="btn-delete" onClick={() => deleteRule(r.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}