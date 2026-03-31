"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "pool", {
    enumerable: true,
    get: function() {
        return pool;
    }
});
const _pg = require("pg");
const pool = new _pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: {
        rejectUnauthorized: false
    }
});
pool.query('SELECT 1').catch((err)=>{
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
});
