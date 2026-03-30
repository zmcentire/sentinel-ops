import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Dashboard }  from './pages/Dashboard';
import { Incidents }  from './pages/Incidents';
import { Endpoints }  from './pages/Endpoints';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function Titlebar() {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const { data: stats } = useSWR('/api/incidents/stats/summary', fetcher, { refreshInterval: 20_000 });
  const { data: endpoints = [] } = useSWR<any[]>('/api/endpoints', fetcher, { refreshInterval: 15_000 });

  const okCount  = endpoints.filter((e: any) => e.latest_success === true).length;
  const errCount = endpoints.filter((e: any) => e.latest_success === false).length;
  const location = useLocation();

  return (
    <div className="titlebar">
      <span className="titlebar-brand">SENTINEL/OPS</span>
      <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>

      <nav className="titlebar-nav">
        <NavLink to="/"          className={({ isActive }) => isActive ? 'active' : ''}>DASHBOARD</NavLink>
        <NavLink to="/incidents" className={({ isActive }) => isActive ? 'active' : ''}>INCIDENTS</NavLink>
        <NavLink to="/endpoints" className={({ isActive }) => isActive ? 'active' : ''}>ENDPOINTS</NavLink>
      </nav>

      <div className="titlebar-right">
        {okCount > 0  && <span className="fleet-pill fleet-ok">{okCount} OK</span>}
        {errCount > 0 && <span className="fleet-pill fleet-err">{errCount} DEGRADED</span>}
        {stats?.avg_mttr_min != null && (
          <span className="fleet-pill fleet-mttr">MTTR {Math.round(stats.avg_mttr_min)}m</span>
        )}
        {stats?.open_count > 0 && (
          <span className="fleet-pill fleet-err">{stats.open_count} OPEN</span>
        )}
        <span className="titlebar-clock">{clock}</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Titlebar />
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/endpoints" element={<Endpoints />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}