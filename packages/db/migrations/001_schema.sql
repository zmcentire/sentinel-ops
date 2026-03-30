CREATE TABLE endpoints (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT            NOT NULL,
    url         TEXT            NOT NULL,
    method      TEXT            NOT NULL DEFAULT 'GET',
    headers     JSONB           NOT NULL DEFAULT '{}',
    body        JSONB,
    interval_s  INT             NOT NULL DEFAULT 60,
    timeout_ms  INT             NOT NULL DEFAULT 5000,
    active      BOOLEAN         NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE check_results(
    time        TIMESTAMPTZ NOT NULL,
    endpoint_id UUID        NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    status_code INT,
    latency_ms  INT         NOT NULL DEFAULT 0,
    success     BOOLEAN     NOT NULL DEFAULT false,
    error_msg   TEXT 
);

SELECT create_hypertable(
    'check_results',
    'time',
    chunk_time_interval => INTERVAL '1 week'
);

CREATE INDEX ON check_results (endpoint_id, time DESC);

ALTER TABLE check_results SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'time DESC',
    timescaledb.compress_segmentby = 'endpoint_id'
);
SELECT add_compression_policy('check_results', INTERVAL '7 days');

SELECT add_retention_policy('check_results', INTERVAL '90 days');

CREATE MATERIALIZED VIEW check_results_1min
WITH (timescaledb.continuous) AS 
SELECT 
    time_bucket('1 minute', time)                               AS bucket,
    endpoint_id,
    COUNT(*)                                                    AS totale_checks,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)                    AS successes,
    AVG(latency_ms)                                             AS avg_latency,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms)    AS p50,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)    AS p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)    AS p99,
    MAX(latency_ms)                                             AS max_latency
FROM check_results
GROUP BY bucket, endpoint_id
WITH NO DATA;

CREATE TABLE incidents (
    id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID                REFERENCES endpoints(id) ON DELETE SET NULL,
    severity    TEXT                NOT NULL CHECK (severity IN ('p1', 'p2', 'p3')),
    title       TEXT                NOT NULL,
    body        TEXT,
    status      TEXT                NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'acknoledged', 'resolved')),
    opened_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    mttr_mintues  INT GENERATED ALWAYS AS (
            EXTRACT(EPOCH FROM (resolved_at - opened_at)) / 60
    ) STORED
);

CREATE TABLE alert_rules (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID            REFERENCES  ENDPOINTS(id) ON DELETE CASCADE,
    metric      TEXT            NOT NULL
                CHECK (metric IN ('latency_p99', 'uptime_pct', 'error_rate')),
    operator    TEXT            NOT NULL CHECK(operator IN ('gt', 'lt')),
    threshold   NUMERIC        NOT NULL,
    window_min  INT             NOT NULL DEFAULT 5,
    severity    TEXT            NOT NULL DEFAULT 'p2'
                CHECK(severity IN ('p1', 'p2', 'p3')),
    cooldown_min INT            NOT NULL DEFAULT 15,
    notify_sms  BOOLEAN         NOT NULL DEFAULT false,
    notify_email BOOLEAN        NOT NULL DEFAULT true,
    active      BOOLEAN         NOT NULL DEFAULT true
);