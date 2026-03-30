# SENTINEL/OPS — API Health & Incident Dashboard

A production-grade API monitoring and incident management system built as a portfolio project targeting Support Engineering and DevOps roles.

## Stack
- **Frontend** — React 18 + TypeScript + Recharts, IBM Plex Mono terminal aesthetic
- **API** — Node.js + Express + WebSocket (live event streaming)
- **Workers** — BullMQ job pipeline (scheduler → checker → evaluator → notifier)
- **Database** — TimescaleDB (hypertables, continuous aggregates, compression + retention policies)
- **Alerts** — Twilio SMS + SendGrid email on threshold violations
- **Deploy** — Railway (API + workers) + Vercel (frontend)

## Architecture

Scheduler → checks queue → Checker (HTTP probe + TimescaleDB insert)
                         → evaluations queue → Evaluator (rule engine against continuous aggregate)
                                             → notifications queue → Notifier (Twilio + SendGrid)

## Key Engineering Decisions
- **TimescaleDB continuous aggregate** — dashboard latency queries run sub-millisecond regardless of data volume by querying the `check_results_1min` materialized view instead of raw rows
- **BullMQ concurrency: 20** — handles 1,200 endpoints per worker instance at 60s intervals without blocking the event loop
- **Generated MTTR column** — `mttr_minutes` is auto-calculated by TimescaleDB when `resolved_at` is written, no application-layer math required
- **WebSocket broadcast** — checker worker calls `broadcast()` after every insert for zero-latency live event log

## Local Setup
\`\`\`bash
cp .env.example .env        # fill in your credentials
docker-compose up -d        # TimescaleDB + Redis
npm install
npm run migrate             # runs 001_schema.sql + 002_seed.sql
npm run dev                 # starts api + workers + frontend concurrently
\`\`\`

## Live Demo
https://your-vercel-url.vercel.app
