import { useState } from 'react';
import { useEndpoints, Endpoint } from '../hooks/useEndpoints';
import { EndpointList }     from '../components/EndpointList';
import { LatencyChart }     from '../components/LatencyChart';
import { UptimeHeatmap }    from '../components/UptimeHeatmap';
import { LiveEventLog }     from '../components/LiveEventLog';
import { IncidentTimeline } from '../components/IncidentTimeline';
import { AlertRuleEditor }  from '../components/AlertRuleEditor';

export function Dashboard() {
  const { endpoints } = useEndpoints();
  const [selected, setSelected] = useState<Endpoint | null>(null);
  const [tab, setTab] = useState<'chart' | 'rules'>('chart');

  const ok  = endpoints.filter(e => e.latest_success === true).length;
  const err = endpoints.filter(e => e.latest_success === false).length;
  const avgLatency = endpoints
    .filter(e => e.latest_latency_ms !== null)
    .reduce((sum, e, _, arr) => sum + (e.latest_latency_ms! / arr.length), 0);

  return (
    <div className="page-body">

      {/* ── Left: endpoint list ── */}
      <div className="panel">
        <div className="panel-header">
          <span className="blink-dot" />
          ENDPOINTS
          <span className="panel-header-right">{endpoints.length} MONITORED</span>
        </div>
        <EndpointList
          endpoints={endpoints}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </div>

      {/* ── Center: charts + log ── */}
      <div className="center-panel">

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-cell">
            <div className="stat-label">ENDPOINTS OK</div>
            <div className={`stat-val ${ok === endpoints.length ? 'val-ok' : 'val-warn'}`}>
              {ok}<span style={{ fontSize: 12, color: 'var(--text-3)' }}>/{endpoints.length}</span>
            </div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">DEGRADED</div>
            <div className={`stat-val ${err > 0 ? 'val-err' : 'val-ok'}`}>{err}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">AVG LATENCY</div>
            <div className="stat-val val-warn">
              {avgLatency > 0 ? `${Math.round(avgLatency)}ms` : '—'}
            </div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">SELECTED</div>
            <div className="stat-val val-neutral" style={{ fontSize: 13, paddingTop: 4 }}>
              {selected?.name ?? '—'}
            </div>
          </div>
        </div>

        {/* View tabs — only show when endpoint selected */}
        {selected && (
          <div className="view-tabs">
            <button className={`view-tab ${tab === 'chart' ? 'active' : ''}`} onClick={() => setTab('chart')}>
              LATENCY
            </button>
            <button className={`view-tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
              ALERT RULES
            </button>
          </div>
        )}

        {/* Chart / rule editor */}
        {selected ? (
          tab === 'chart' ? (
            <div className="chart-section">
              <div className="chart-header">
                <span className="chart-title">{selected.name.toUpperCase()} — LATENCY (ms)</span>
                <span className="chart-subtitle">60 MIN WINDOW</span>
              </div>
              <div className="chart-wrap">
                <LatencyChart endpointId={selected.id} windowMin={60} />
              </div>
              <div className="chart-title" style={{ marginTop: 4 }}>90-DAY UPTIME</div>
              <UptimeHeatmap endpointId={selected.id} />
            </div>
          ) : (
            <AlertRuleEditor endpointId={selected.id} />
          )
        ) : (
          <div className="no-selection">← SELECT AN ENDPOINT TO INSPECT</div>
        )}

        <LiveEventLog />
      </div>

      {/* ── Right: incidents ── */}
      <div className="panel">
        <IncidentTimeline />
        {/* heatmap already embedded in IncidentTimeline's parent panel */}
      </div>

    </div>
  );
}