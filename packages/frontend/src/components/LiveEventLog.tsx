import { useLiveLog, LogEntry } from '../hooks/useLiveLog';

export function LiveEventLog() {
  const log = useLiveLog(120);

  return (
    <div className="log-section">
      <div className="panel-header">
        <span className="blink-dot" />
        LIVE EVENT LOG
        <span className="panel-header-right">STREAMING · WS</span>
      </div>
      <div className="log-body">
        {log.length === 0 && (
          <div style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: 10 }}>
            Waiting for events...
          </div>
        )}
        {log.map((entry: LogEntry, i: number) => (
          <div key={i} className="log-entry">
            <span className="log-ts">{entry.timestamp.slice(11, 19)}</span>
            <span className={`log-code ${entry.success ? 'log-ok' : 'log-err'}`}>
              {entry.statusCode ?? 'ERR'}
            </span>
            <span className="log-name">{entry.name}</span>
            {entry.success
              ? <span className="log-ms">{entry.latencyMs}ms</span>
              : <span className="log-errmsg">{entry.errorMsg}</span>
            }
          </div>
        ))}
      </div>
    </div>
  );
}