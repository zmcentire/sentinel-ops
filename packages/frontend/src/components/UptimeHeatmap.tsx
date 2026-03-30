import { useCheckHistory } from '../hooks/useCheckHistory';

interface Props { endpointId: string; }

export function UptimeHeatmap({ endpointId }: Props) {
  const { history } = useCheckHistory(endpointId, 90 * 24 * 60);

  const dayMap: Record<string, number> = {};
  for (const row of history) {
    const day = row.bucket.slice(0, 10);
    dayMap[day] = Math.max(dayMap[day] ?? 0, row.uptime_pct ?? 0);
  }

  const days: string[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const colorFor = (pct: number | undefined) => {
    if (pct === undefined) return '#1c1e1a';
    if (pct >= 99)         return '#1a5c36';
    if (pct >= 95)         return '#7a4e08';
    return                        '#7a1e15';
  };

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-label">90-DAY UPTIME</div>
      <div className="heatmap-grid">
        {days.map(day => (
          <div
            key={day}
            className="hm-cell"
            style={{ background: colorFor(dayMap[day]) }}
            title={`${day}: ${dayMap[day] !== undefined ? dayMap[day].toFixed(1) + '%' : 'no data'}`}
          />
        ))}
      </div>
      <div className="heatmap-legend">
        <span style={{ color: '#1a5c36' }}>99%+</span>
        <span style={{ color: '#7a4e08' }}>95–99%</span>
        <span style={{ color: '#7a1e15' }}>&lt;95%</span>
        <span style={{ color: '#3e3828' }}>no data</span>
      </div>
    </div>
  );
}