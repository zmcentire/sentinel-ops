import { Endpoint } from '../hooks/useEndpoints';

interface Props {
  endpoints:  Endpoint[];
  selectedId: string | null;
  onSelect:   (ep: Endpoint) => void;
}

export function EndpointList({ endpoints, selectedId, onSelect }: Props) {
  return (
    <div className="endpoint-list">
      {endpoints.map(ep => {
        const dotClass =
          ep.latest_success === null  ? 'dot-unknown' :
          ep.latest_success           ? 'dot-ok'      : 'dot-error';

        return (
          <div
            key={ep.id}
            className={`endpoint-item ${selectedId === ep.id ? 'active' : ''}`}
            onClick={() => onSelect(ep)}
          >
            <span className={`status-dot ${dotClass}`} />
            <div className="ep-info">
              <div className="ep-name">{ep.name}</div>
              <div className="ep-url">{ep.method} {ep.url}</div>
            </div>
            {ep.latest_latency_ms !== null && (
              <span className="ep-latency">{ep.latest_latency_ms}ms</span>
            )}
          </div>
        );
      })}
    </div>
  );
}