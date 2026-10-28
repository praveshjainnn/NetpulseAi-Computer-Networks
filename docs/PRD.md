# NetPulse AI — Product Requirements Document

**Status:** Final
**Owner:** Tanish Poddar
**One-liner:** A real-time 5G network bandwidth allocation simulator that demonstrates — visually and measurably — how AI and reinforcement learning outperform equal-split allocation across four user types.

---

## 1. Problem

5G network allocation research is notoriously hard to make tangible. Academic papers show formulas; real networks are proprietary. There is no accessible, interactive tool that lets someone watch AI-based allocation outperform a traditional baseline in real time, with live metrics and an explanation of *why* each decision was made. Developers and students studying network optimization have to take results on faith rather than observing them directly.

---

## 2. Goals (v1 / MVP)

1. Simulate a 5G bandwidth allocation scenario with four realistic user types (video, gaming, IoT, VoIP) at 100 ms tick resolution.
2. Run three allocators — Baseline (equal split), AI (weighted priority), and RL (Multi-Armed Bandit) — against identical traffic demands so the comparison is fair.
3. Stream live metrics and allocations to the browser over WebSocket with less than 50 ms perceived latency.
4. Integrate Groq (Llama 3.3-70B) to generate natural-language explanations of allocation strategy every 50 ticks.
5. Persist simulation history to Supabase so past runs can be reviewed, compared, and replayed.
6. Deployed with a live demo URL — no local setup required to evaluate the project.

---

## 3. Non-Goals (explicit scope cuts)

- **User authentication** — single-session per browser tab is sufficient for an interactive demo; login/signup adds friction without benefit at this scale.
- **Real radio telemetry** — the simulator uses probabilistic traffic generators, not live 5G network data; O-RAN integration is a research-grade extension for v2.
- **Billing / usage quotas** — Groq API is called server-side on a shared key; per-user rate limiting is unnecessary at demo traffic levels.
- **Mobile-native app** — responsive web is sufficient; a React Native version adds no insight beyond what the browser delivers.
- **More than 4 user types** — the set (video, gaming, IoT, VoIP) covers the canonical 5G QoS classes; adding more muddles the comparison without a richer traffic model.

---

## 4. Users

**Primary:** Developers and students studying network optimization, ML applied to infrastructure, or 5G QoS — they want to see the allocation algorithms working on real data, not just read equations.

**Secondary:** Technical recruiters and portfolio evaluators — the live demo must be self-explanatory, load quickly, and show a meaningful AI vs. baseline gap within the first 30 seconds.

---

## 5. User Stories

1. *As a developer,* I want to start a simulation with a single click and see three allocation strategies running in parallel so that I can compare their behaviour without any configuration.
2. *As a student,* I want to configure bandwidth, latency, congestion factor, and random seed so that I can reproduce a specific scenario and understand how parameters affect outcomes.
3. *As a user,* I want live charts updating every 100 ms so that I can watch the RL allocator learn and the AI allocator respond to Groq recommendations in real time.
4. *As a user,* I want a natural-language explanation panel that shows why the AI allocator made its latest priority decision so that I understand the reasoning without reading code.
5. *As a user,* I want to browse past simulation runs, see their QoS improvement percentages, and replay a specific run so that I can compare sessions.
6. *As a developer,* I want a public REST API with Swagger docs so that I can query simulation state or integrate the backend into my own experiments.

---

## 6. Functional Requirements

### 6.1 Simulation Control

- System must accept a `SimulationConfig` (total bandwidth 10–1000 Mbps, base latency 1–100 ms, congestion factor 1–10, packet loss rate 0–100 %, optional random seed).
- System must support start, stop, and reset operations per session.
- System must support concurrent sessions without shared state (session isolation via UUID).

### 6.2 Allocation Strategies

- **Baseline:** divide total bandwidth equally among four user types each tick.
- **AI Allocator:** apply weighted priority (gaming 1.5×, video 1.3×, VoIP 1.1×, IoT 0.8×); weights are dynamically overridden by the Groq layer.
- **RL Allocator:** Multi-Armed Bandit with epsilon-greedy (ε = 0.15); 7 discrete weight options per user type; Q-values updated via reward signal each tick.
- All three allocators must receive identical traffic demand snapshots per tick for fair comparison.

### 6.3 Metrics

- Per-tick QoS score computed as: throughput (40 %) + latency score (40 %) + packet retention (20 %).
- System must maintain a rolling 100-tick window of metrics for each allocator.
- System must expose aggregated statistics (mean, min, max per allocator) via REST.
- QoS improvement percentage (AI vs. Baseline) must be displayed prominently in the dashboard banner.

### 6.4 AI Integration

- System must call Groq API (Llama 3.3-70B) every 50 ticks with a structured JSON snapshot of network state.
- Response must include updated priority weights and a natural-language reasoning string.
- System must fall back gracefully (retain last valid weights) if the API call fails or times out.

### 6.5 Real-time Streaming

- WebSocket endpoint must broadcast a `NetworkState` frame every tick (100 ms).
- Frontend must reconnect automatically on WebSocket disconnection.

### 6.6 History & Replay

- Completed simulation runs must be stored in Supabase with metadata, tick snapshots (every 5 ticks), and Groq decisions.
- System must provide a paginated history list, single-run detail, CSV/JSON export, and WebSocket replay.

### 6.7 API

- All REST endpoints must be documented in Swagger UI at `/docs`.
- API must return appropriate HTTP status codes (400, 404, 409, 500) with descriptive error messages.

---

## 7. Non-Functional Requirements

- **Latency:** WebSocket tick broadcast must complete within the 100 ms tick window; Groq calls are async and must not block the simulation loop.
- **Security:** API keys in env vars only, never committed. Security headers (`X-Frame-Options: DENY`, `nosniff`, HSTS in production) on every response. CORS restricted to known origins.
- **Cost:** Groq API is called at most once per 50 ticks (once per 5 seconds), preventing runaway API spend on long-running sessions.
- **Reliability:** Supabase unavailability must not crash the simulation — all DB writes are optional, logged on failure, and the in-memory simulation continues.
- **Reproducibility:** When a `random_seed` is provided, traffic generation is deterministic — same config produces the same tick sequence for debugging.

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Live demo load to first WebSocket frame | Under 3 seconds on a cold Render instance |
| AI vs. Baseline QoS improvement (typical run) | Measurable positive gap visible within 20 ticks |
| RL convergence | Q-values stabilise (exploitation > exploration) within 200 ticks |
| History replay fidelity | Replayed tick sequence matches original within floating-point tolerance |
| Groq explanation relevance | Each explanation references the dominant traffic type that shifted weight |

---

## 9. Risks & Open Questions

- **Render cold-start latency** — the free Render tier spins down after inactivity; first request can take 30–60 s. Mitigated by a loading state in the frontend and a `/api/health` ping-on-mount.
- **Groq rate limits** — the free Groq tier has per-minute token limits. Mitigated by the 50-tick call cadence and a `call_in_progress` guard against concurrent calls.
- **RL convergence speed** — with ε = 0.15 and 7 options per user type, the bandit may take hundreds of ticks to outperform the AI allocator; this is expected and is part of the educational story, not a bug.
- **Open question** — should the RL reward function be the raw QoS score or the delta over baseline? Delta is more informative for learning but harder to explain to users.

---

## 10. v2 Candidates

- **User authentication + per-account history** — would enable persistent cross-session comparison and sharing of run URLs.
- **O-RAN telemetry adapter** — replace probabilistic traffic generators with real network data for production-realism demos.
- **Jitter metric** — add packet jitter to the QoS formula, particularly relevant for gaming and VoIP user types.
- **Configurable allocator parameters** — expose ε, learning rate, and weight options in the UI so users can experiment with the RL algorithm directly.
- **GitHub Check Run integration** — emit a QoS comparison summary as a GitHub status check for CI pipelines that simulate network conditions.
