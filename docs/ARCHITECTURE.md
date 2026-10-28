# NetPulse AI — Architecture

<!--
Companion to PRD.md.
PRD says WHAT the system does. This says HOW.
Audience: an engineer who needs to understand the system well
enough to build it, debug it, or extend it.
-->

---

## 1. Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Charts | Custom React components (Recharts-style) |
| Backend | Python 3.11 · FastAPI 0.115 · uvicorn |
| WebSocket | FastAPI native WebSocket · `websockets` 13 |
| AI | Groq API — Llama 3.3-70B-Versatile |
| RL | NumPy — Multi-Armed Bandit (epsilon-greedy) |
| Database | Supabase PostgreSQL (managed) — optional |
| Validation | Pydantic v2 |
| Hosting | Vercel (frontend) · Render (backend) |

---

## 2. Components

```
backend/
  simulator/      Core tick-based event loop + traffic generators
  allocators/     Three allocation strategies (Baseline, AI, RL)
  groq/           Groq API integration layer for strategic insights
  metrics/        QoS metrics collection and rolling-window statistics
  api/            FastAPI routes, WebSocket endpoint, session manager, history
  db/             Supabase client wrapper and repository (optional persistence)
  models.py       Pydantic data models shared across all layers

frontend/
  app/            Next.js App Router pages (home, dashboard, history, how-it-works)
  components/     UI components: charts, panels, stats table, configuration
  hooks/          useWebSocket — manages connection lifecycle and state
```

### SimulationEngine (`backend/simulator/engine.py`)

Core discrete-event loop running at 100 ms intervals. On each tick it snapshots traffic demands once (shared across all three allocators for a fair comparison), runs each allocator, computes QoS metrics, optionally calls the Groq layer every 50 ticks, persists a snapshot to Supabase, and broadcasts the full `NetworkState` over WebSocket. Does not perform any allocation math itself — delegates entirely to the allocator classes.

### Allocators (`backend/allocators/`)

Three strategy implementations with a common interface: `allocate(total_bandwidth, demands, congestion_level) -> AllocationDecision`.

- **BaselineAllocator** — splits total bandwidth equally among the four user types uncapped; serves as the traditional control policy for comparison.
- **AIAllocator** — applies weighted priority heuristics. Gaming (1.5×) and Video (1.3×) get higher shares; IoT (0.8×) gets less. Allocations are capped at demand and spare bandwidth redistributed via iterative **waterfill** (`backend/allocators/utils.py`). Weights are dynamically overridden by the Groq layer every 50 ticks.
- **RLAllocator** — Multi-Armed Bandit with epsilon-greedy (ε = 0.15) and seeded NumPy RNG (`np.random.default_rng`). Maintains Q-values for 7 discrete weight options per user type; also uses **waterfill** so allocations never exceed demand. Updated every tick using the multi-objective reward delta:
  $$\text{reward} = J(\text{RL}) - J(\text{Baseline})$$
  $$J = 0.7 \times \left(\frac{\text{QoS}}{100}\right) + 0.3 \times \left(\frac{\text{utilization}}{100}\right)$$

### GroqOverrideLayer (`backend/groq/override_layer.py`)

Fires an async call to `api.groq.com/openai/v1/chat/completions` every 50 ticks. Sends a structured JSON snapshot of current network state. Parses the returned priority weights and injects them into `AIAllocator`. If the API key is absent or the call times out (30 s limit), the allocator continues with its last known weights, and the UI displays rule-based explainability synthesizing current RL learning stats — degrading gracefully rather than stopping the simulation.

### MetricsCollector (`backend/metrics/collector.py`)

Maintains rolling deques of 100 ticks (10 seconds of real time) across strategies. Computes composite QoS score and Network Utilization per tick:

```
QoS_Score = (normalized_throughput × 0.40)
           + (latency_score × 0.40)
           + (packet_retention × 0.20)

Utilization_Pct = 100 × sum(min(allocated, demand)) / total_bandwidth
```

Where `latency_score = 100 − min(latency_ms, 100)` and `packet_retention = 100 − packet_loss_pct`.
Wasted over-allocation does not contribute to utilization.

### SessionManager (`backend/api/session_manager.py`)

Manages per-user `SimulationEngine` instances keyed by UUID session IDs. Runs a background cleanup task every 5 minutes to evict idle sessions. Allows multiple concurrent users without shared state.

### Database Layer (`backend/db/`)

`SupabaseClient` wraps the official Supabase Python client, reading `SUPABASE_URL` and `SUPABASE_KEY` from environment. If either is missing the client self-disables and logs a notice — all history features are silently skipped. `SimulationRepository` provides methods for creating runs, appending tick snapshots, storing Groq decisions, and querying history.

### Frontend (`frontend/`)

Next.js App Router. The `useWebSocket` hook owns the connection lifecycle — it reconnects on drops and feeds incoming `NetworkState` frames into React state. Dashboard renders live charts (allocation, throughput, latency, QoS breakdown), comparison panels, statistics table, and an explainability panel showing the latest Groq reasoning.

---

## 3. Data Flow

```
[Browser]
  → POST /api/simulation/start   (returns X-Session-ID header)
  → GET  /ws/{session_id}        (WebSocket upgrade)

[SimulationEngine — 100ms tick]
  Traffic generators snapshot demands
      │
      ├─► BaselineAllocator.allocate()  ─┐
      ├─► AIAllocator.allocate()        ─┤─► MetricsCollector.record()
      └─► RLAllocator.allocate()        ─┘        │
                                                   ▼
                                          NetworkState assembled
                                                   │
                         every 50 ticks ──► GroqOverrideLayer.evaluate_strategy()
                                                   │ updates AIAllocator weights
                                                   ▼
                                          WebSocket broadcast → [Browser]
                                                   │
                                          Supabase snapshot (every 5 ticks)
```

1. Browser POSTs to `/api/simulation/start` with a `SimulationConfig`; server creates a session and returns a UUID session ID.
2. Browser opens a WebSocket to `/ws/{session_id}`; the engine registers a broadcast callback.
3. Every 100 ms the engine generates one traffic demand snapshot shared by all three allocators.
4. All three allocators run in sequence; metrics collector records results.
5. Every 50 ticks the Groq layer fires an async API call; on response it updates the AI allocator's priority weights.
6. The assembled `NetworkState` is sent over WebSocket to the browser; charts update in real time.
7. Every 5 ticks a `tick_snapshot` row is written to Supabase for history replay.

---

## 4. Database Schema

Three tables in Supabase PostgreSQL, all with UUID primary keys and `JSONB` for flexible nested data.

- `simulation_runs` — UUID, config (JSONB), status (`running`/`completed`/`stopped`), start/end timestamps, total ticks, avg QoS scores for baseline and AI, improvement pct.
- `tick_snapshots` — UUID, `run_id` FK, tick number, timestamp, demands (JSONB), baseline result (JSONB), AI result (JSONB), congestion level. Cascades on run delete.
- `groq_decisions` — UUID, `run_id` FK, tick, timestamp, reasoning text, recommended weights (JSONB). Cascades on run delete.

**Indexes:** `idx_simulation_runs_start_time(start_time DESC)` — chronological listing. `idx_tick_snapshots_run_tick(run_id, tick)` — fast range replay. `idx_groq_decisions_run_id(run_id)` — decision lookup per run.

---

## 5. AI / LLM Design

### Input

Structured JSON sent every 50 ticks containing: current tick number, total bandwidth cap, congestion level (0–1), and per-user-type metrics (allocated Mbps, latency ms, packet loss %, throughput). No raw packet data or simulation internals are sent.

### System prompt strategy

The system prompt instructs Llama 3.3-70B to act as a 5G network optimization expert and return only a JSON object with `recommended_weights` (one float per user type, 0.5–2.0 range) and a `reasoning` string. It explicitly forbids prose responses without the JSON structure and narrative filler.

### Response schema

```jsonc
{
  "recommended_weights": {
    "video_streaming": 1.3,
    "online_gaming": 1.5,
    "iot_devices": 0.7,
    "voip_messaging": 1.1
  },
  "reasoning": "Gaming latency is spiking above threshold; increased its weight..."
}
```

### Validation

The response is parsed as JSON; if the `recommended_weights` keys are missing or values are outside 0.5–2.0, the layer falls back to `last_valid_weights`. A `call_in_progress` flag prevents concurrent Groq calls.

### Failure handling

The `httpx.AsyncClient` has a 30 s timeout. On timeout or HTTP error the layer logs the failure and returns `None` — the simulation tick completes normally with the AI allocator using its existing weights. The frontend receives no error; the explainability panel retains the last successful explanation.

---

## 6. API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/simulation/start` | Creates a session, initializes engine, starts simulation loop |
| `POST` | `/api/simulation/stop` | Stops the running loop for this session |
| `POST` | `/api/simulation/reset` | Resets engine state without deleting the session |
| `DELETE` | `/api/simulation/session` | Tears down session and frees all resources |
| `GET` | `/api/simulation/config` | Returns current `SimulationConfig` for this session |
| `GET` | `/api/simulation/metrics` | Returns rolling-window `MetricsStatistics` (100-tick window) |
| `GET` | `/api/simulation/status` | Running state, tick count, session info, DB health |
| `GET` | `/api/simulation/rl-stats` | Q-values, epsilon, learning iteration count |
| `GET` | `/api/health` | System health: DB status + active session count |
| `WS` | `/ws/{session_id}` | Real-time `NetworkState` stream at 100 ms intervals |
| `GET` | `/api/history` | Paginated list of simulation runs |
| `GET` | `/api/history/{run_id}` | Single run metadata + all Groq decisions |
| `DELETE` | `/api/history/{run_id}` | Permanently deletes run and all snapshots |
| `GET` | `/api/history/{run_id}/export` | Export run data as CSV or JSON |
| `WS` | `/api/history/{run_id}/replay` | Replays tick snapshots via WebSocket |

---

## 7. Security

- **Secrets:** `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` live only in env vars — never committed. Production secrets set in Render environment dashboard.
- **Security headers:** `SecurityHeadersMiddleware` adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy` on every response. HSTS is only added in production (`ENVIRONMENT=production`).
- **CORS:** Allowlist is explicit — `localhost:3000`, `netpulseai.tanisheesh.in`, `netpulseai.vercel.app`, and the Vercel preview URL. No wildcard origins.
- **Session isolation:** Each user gets a UUID session ID; no session can access another's engine or metrics.
- **LLM key:** `GROQ_API_KEY` is read server-side only — never returned in API responses or exposed to the browser.

---

## 8. Error Handling & Reliability

| Failure | Behaviour |
|---|---|
| Groq API timeout / error | Simulation continues with previous AI allocator weights; explainability panel retains last explanation |
| Supabase disconnected | All history writes silently skipped; simulation runs in-memory only; `/api/health` reports `degraded` |
| WebSocket client disconnect | Engine keeps running; state is broadcast to remaining listeners; client reconnects on next page load |
| Invalid session ID | `404` returned immediately; no engine interaction |
| Simulation already running | `409` on `/start`; client must stop first |
| Concurrent Groq call | `call_in_progress` flag prevents double-firing; second evaluation is skipped |

---

## 9. Deployment

1. **Frontend:** Vercel project linked to the GitHub repo — auto-deploy on push to `main`. Environment variable `NEXT_PUBLIC_API_URL` points to the Render backend.
2. **Backend:** Render web service (`render.yaml` in `backend/`). Build: `pip install -r requirements.txt`. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`. Python 3.11.
3. **Database:** Supabase hosted project — schema applied via `backend/db/schema.sql`. No migration tooling needed; `IF NOT EXISTS` guards on all DDL.
4. **Env vars in Render:** `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `ENVIRONMENT=production` — all set via Render dashboard, not committed.

---

## 10. Explicit Scope Cuts

- **Authentication / user accounts** — simulation is stateless per-session; adding auth would require user DB and token management, deferred to v2.
- **Multi-region Supabase** — single-region Supabase is sufficient for MVP latency targets; replication adds operational overhead without clear user benefit.
- **Jitter metric** — packet jitter is relevant for gaming QoS but adds complexity to the traffic model; deferred in favour of shipping latency + packet-loss first.
- **Real 5G radio data ingestion** — simulator uses probabilistic traffic generators; integrating real network telemetry (e.g. O-RAN interfaces) is a v2 research direction.

---

## 11. Acknowledgements and Modifications

This architecture extends the original **NetPulse AI** platform authored by **Tanish Poddar** under the GNU General Public License v3.0.

### Modifications Summary:
1. **Network Utilization Metric:** Added network-wide utilization percentage calculation ($100 \times \sum \text{throughput} / \text{capacity}$) integrated into `AllocationResult`, `MetricsCollector`, WebSocket payloads, and frontend dashboards.
2. **Multi-Objective RL Formulation:** Reformulated the Multi-Armed Bandit allocator reward function to optimize joint QoS and utilization objectives relative to the baseline equal-split control policy ($J = 0.7 \times \text{QoS} + 0.3 \times \text{utilization}$).
3. **Iterative Water-Fill Allocation:** Created `backend/allocators/utils.py` implementing water-fill allocation for AI and RL allocators. Enforces strict demand capping and dynamically redistributes unused bandwidth to remaining unmet demands, preventing wasted capacity while leaving the baseline equal-split uncapped.
4. **Determinism and Reproducibility:** Seeded NumPy RNG instances for the RL allocator and derived per-traffic-generator seed offsets (`seed + index`) ensuring reproducible experiments and deterministic simulations.
5. **Stateful Engine Reset:** Re-initializes allocators, traffic generators, and metrics collector on reset to ensure clean reproduction across identical seeds.
6. **Graceful Explainability:** Added rule-based fallback explainability extracting real-time RL Q-learning statistics when Groq API keys are not configured.

