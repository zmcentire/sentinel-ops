import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useCheckHistory } from '../hooks/useCheckHistory';

interface Props { endpointId: string; windowMin?: number; }

export function LatencyChart({ endpointId, windowMin = 60 }: Props) {
  const { history, isLoading } = useCheckHistory(endpointId, windowMin);

  // Guard against non-array responses
  if (isLoading) return <div className="no-selection" style={{ flex: 1 }}>Loading...</div>;
  if (!Array.isArray(history) || !history.length) {
    return <div className="no-selection" style={{ flex: 1 }}>No data yet — checks running every 30s</div>;
  }

  const data = history.map(row => ({
    label:   row.bucket.slice(11, 16),
    p99:     Math.round(row.p99   ?? 0),
    p50:     Math.round(row.p50   ?? 0),
    avg:     Math.round(row.avg_latency ?? 0),
  }));

  const maxP99 = Math.max(...data.map(d => d.p99));
  const p99Color = maxP99 > 1000 ? '#c0392b' : maxP99 > 500 ? '#c8820a' : '#c8820a';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="gp99" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={p99Color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={p99Color} stopOpacity={0}   />
          </linearGradient>
          <linearGradient id="gp50" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2a9d5c" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#2a9d5c" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(200,130,10,0.07)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: '#3e3828', fontFamily: 'IBM Plex Mono' }}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#3e3828', fontFamily: 'IBM Plex Mono' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}ms`}
        />
        <Tooltip
          contentStyle={{
            background: '#1c1e1a',
            border: '1px solid rgba(200,130,10,0.3)',
            borderRadius: 2,
            fontFamily: 'IBM Plex Mono',
            fontSize: 10,
            color: '#a89870',
          }}
          formatter={(val: number, name: string) => [`${val}ms`, name.toUpperCase()]}
          labelStyle={{ color: '#c8820a', marginBottom: 4 }}
        />
        <Area type="monotone" dataKey="p99" stroke={p99Color}  fill="url(#gp99)" strokeWidth={1.5} dot={false} name="p99" />
        <Area type="monotone" dataKey="p50" stroke="#2a9d5c"   fill="url(#gp50)" strokeWidth={1.5} dot={false} name="p50" />
        <Area type="monotone" dataKey="avg" stroke="#3e3828"   fill="none"        strokeWidth={1}   dot={false} strokeDasharray="3 4" name="avg" />
      </AreaChart>
    </ResponsiveContainer>
  );
}