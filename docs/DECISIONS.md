# Engineering Decisions — NetPulse AI

<!--
This is not user documentation. This is for technical interviewers
and senior engineers who want to understand WHY the system is built
the way it is. Every entry answers a question an interviewer might ask.
-->

---

## Decision 1 — One traffic snapshot per tick, shared by all allocators

**Context:** The whole point of the simulator is to compare three allocation strategies. If each allocator generates its own traffic demand, randomness makes the comparison meaningless — you'd never know whether one allocator won because it was smarter or because it got an easier demand.

**Decision:** The `SimulationEngine` generates a single traffic demand snapshot at the start of each tick and passes an identical copy to `BaselineAllocator`, `AIAllocator`, and `RLAllocator`.

**Reason:** This is the only way to make the comparison scientifically valid. Same inputs, different strategies, measure the output difference — that is the controlled experiment. A shared snapshot also means the congestion level is the same for all three, so you can't attribute a win to the allocator seeing less load.

**Tradeoff:** In a real 5G network each base station sees its own traffic; the shared-snapshot model is a simplification. The simulator is explicitly a benchmark environment, not a production scheduler — the simplification is appropriate and intentional.

---

## Decision 2 — Groq layer updates weights asynchronously, does not block the tick

**Context:** Calling an external API every tick (100 ms) is impossible — Groq's median response time is 1–3 seconds. Blocking the tick loop to wait for an LLM response would freeze the simulation.

**Decision:** The Groq layer fires its API call asynchronously with `asyncio` every 50 ticks (5 seconds). The tick loop does not `await` the result. When the response arrives it updates the `AIAllocator`'s priority weights; the next tick uses the new weights.

**Reason:** Keeps the simulation loop deterministically at 100 ms. The 50-tick cadence (5 s real time) is fast enough to show meaningful weight adaptation in the dashboard while staying well within Groq's free-tier rate limits.

**Tradeoff:** There is a 1–3 second lag between when the Groq response arrives and when it takes effect. On a slow network the recommendation may be slightly stale relative to the current network state. This is acceptable for a demonstration simulator.

---

## Decision 3 — Multi-Armed Bandit for RL, not a full Deep Q-Network

**Context:** The RL allocator needs to learn optimal bandwidth weights during the simulation. Options ranged from a simple lookup table up to a neural network (DQN).

**Decision:** Epsilon-greedy Multi-Armed Bandit with 7 discrete weight options per user type and Q-values stored as NumPy arrays.

**Reason:** A bandit converges within hundreds of ticks — fast enough to observe learning in a live demo. DQN would require a state-action space design, replay buffer, and a neural network — substantial complexity with no visible payoff for a portfolio demonstration. NumPy-only implementation has zero heavy-ML dependencies and runs the full allocation in under 10 ms per tick. The trade-off between exploration (ε = 0.15) and exploitation is visible in the RL stats panel, making the learning story educational.

**Tradeoff:** A bandit has no state — it doesn't condition its weights on the current network state; it only learns which weights have historically produced good QoS. A DQN or contextual bandit would be more adaptive to sudden traffic shifts. That gap is a feature of the educational framing, not hidden.

---

## Decision 4 — Supabase optional, simulation runs without it

**Context:** History persistence is useful but not core to the interactive demo. Requiring a live database connection would make local development painful and cause complete failure if the database is unavailable.

**Decision:** `SupabaseClient` self-disables when `SUPABASE_URL` or `SUPABASE_KEY` are absent. All DB writes in the engine are guarded by `if self.repository:`. The `/api/health` endpoint reports `degraded` (not `down`) to distinguish DB-optional degradation from a true crash.

**Reason:** The simulation — traffic generation, allocation, metrics, WebSocket streaming — is entirely in-memory. Supabase only adds persistence for the history and replay features. Graceful degradation lets someone run the full simulator locally without a cloud database, and means a Supabase outage cannot take down the live demo.

**Tradeoff:** In-memory sessions are lost on Render restarts. A user who was mid-simulation will need to start a new run. Acceptable given the free-tier hosting constraint.

---

## Decision 5 — Session-based multi-user isolation via UUID header

**Context:** The simulator is a live demo accessible by multiple concurrent users. Without isolation, user A's start/stop would affect user B's session.

**Decision:** On `/api/simulation/start`, the server creates a `SimulationEngine` instance keyed to a UUID session ID and returns it in the `X-Session-ID` response header. All subsequent requests must include this header; the session manager routes them to the correct engine. Sessions expire after 30 minutes of inactivity and are cleaned up by a background task every 5 minutes.

**Reason:** Stateless token-in-header is simpler than cookies for cross-origin demo setups. UUID eliminates collision risk. The cleanup task prevents memory leaks on the free-tier Render instance (512 MB RAM).

**Tradeoff:** Session IDs are not signed or encrypted — they are opaque UUIDs stored in `localStorage`. If an attacker guesses a UUID they can view another user's metrics. For a public demo simulator with no sensitive data this is an acceptable risk; for a production system sessions would be signed tokens.

---

## What I'd do differently in v2

- **Signed session tokens** — replace bare UUID session IDs with JWTs so sessions are tamper-evident and can carry user identity without a separate auth layer.
- **Contextual bandit for RL** — feed the current network state (congestion level, per-user-type demand) into the action-selection step so the RL allocator adapts to real-time conditions rather than learning global averages.
- **Structured Groq output validation** — add a Pydantic model for the Groq response and validate weights against the schema before injecting them into the allocator, rather than relying on a loose dict parse.
- **Render persistent instance** — move off the free tier to eliminate cold-start delays; the 30–60 s spin-up is the largest UX friction point for first-time visitors.

---

## Explicit non-decisions (deferred to v2)

| Feature | Why deferred |
|---|---|
| User authentication | Demo scope is single-session per tab; auth adds friction without enabling any new capability at this scale |
| Real O-RAN telemetry | Integrating live network data requires hardware access or carrier APIs; probabilistic generators deliver the same educational value with zero dependencies |
| Jitter metric | Adds complexity to the traffic model and QoS formula; latency + packet loss already tell the gaming/VoIP story clearly |
| Per-user Groq API keys | All demo users share the server-side key; per-user keys require auth + billing, which is v2 scope |
