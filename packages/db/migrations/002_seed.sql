INSERT INTO endpoints (name, url, method, interval_s, timeout_ms) VALUES
    ('auth-service',    'https://httpbin.org/delay/0', 'GET', 30, 3000),
    ('payment-gateway', 'https://httpbin.org/delay/1',  'POST', 60, 5000),
    ('ml-inference',    'https://httpbin.org/delay/2', 'POST', 60, 8000);

INSERT INTO alert_rules (endpoint_id, metric, operator, threshold, severity, window_min, notify_sms, notify_email)
SELECT id, 'latency_p99', 'gt', 500,  'p2', 5, false, true FROM endpoints
WHERE name = 'auth-service'
UNION ALL
SELECT id, 'latency_p99', 'gt', 2000, 'p1', 5, true,  true FROM endpoints
WHERE name = 'payment-gateway'
UNION ALL
SELECT id, 'uptime_pct',  'lt', 95,   'p1', 5, true,  true FROM endpoints
WHERE name = 'ml-inference';