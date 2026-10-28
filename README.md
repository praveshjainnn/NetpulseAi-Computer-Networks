<p align="center">
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="8" fill="url(#logoGrad)"/>
    <path d="M8 20 L12 20 L14 12 L16 28 L18 16 L20 24 L22 20 L32 20"
          stroke="white" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="14" cy="12" r="1.5" fill="white" opacity="0.8"/>
    <circle cx="16" cy="28" r="1.5" fill="white" opacity="0.8"/>
    <circle cx="18" cy="16" r="1.5" fill="white" opacity="0.8"/>
    <circle cx="20" cy="24" r="1.5" fill="white" opacity="0.8"/>
  </svg>
</p>

<h1 align="center">NetPulse AI</h1>

<p align="center">
  <strong>Watch AI outperform traditional 5G network allocation in real time.</strong>
</p>

---

<p align="center">
  <img src="docs/assets/demo.gif" alt="NetPulse AI demo" width="700">
</p>

---

## What is NetPulse AI?

NetPulse AI is a full-stack 5G bandwidth allocation simulator that runs three strategies — a traditional equal-split baseline, an AI weighted-priority allocator, and a reinforcement-learning Multi-Armed Bandit — against identical traffic demands and streams the comparison to your browser in real time. Every 50 simulation ticks, a Groq-hosted Llama 3.3-70B model evaluates the current network state and adjusts the AI allocator's priorities, narrating its reasoning in plain English. The result is a live, measurable demonstration that AI allocation produces consistently higher QoS scores than the baseline — visible within seconds of starting a simulation.

---

## What you get

- **Three-way live comparison** — Baseline, AI, and RL allocators run against the same tick-by-tick traffic demands; charts update every 100 ms over WebSocket.
- **Groq-powered explainability** — Llama 3.3-70B evaluates network state every 5 seconds and tells you exactly why it shifted bandwidth priorities between gaming, video, VoIP, and IoT traffic.
- **RL that visibly learns** — an epsilon-greedy Multi-Armed Bandit starts exploring and converges toward optimal weights over hundreds of ticks; you can watch its Q-values stabilise in the stats panel.
- **Simulation history and replay** — every run is persisted to Supabase; you can replay any past session tick-by-tick or export it as CSV/JSON.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router, TypeScript) · Tailwind CSS |
| Backend | Python 3.11 · FastAPI 0.115 · uvicorn |
| Real-time | WebSocket (FastAPI native) — 100 ms tick broadcast |
| AI | Groq API — Llama 3.3-70B-Versatile |
| RL | NumPy — Multi-Armed Bandit (epsilon-greedy, no ML framework) |
| Database | Supabase PostgreSQL — optional, graceful degradation |
| Hosting | Vercel (frontend) · Render (backend) |

---

## Engineering Decisions

**Why one shared traffic snapshot per tick?**
The comparison only means something if all three allocators face identical inputs. Separate demand generation would let randomness masquerade as strategy quality. One snapshot per tick is the controlled-experiment approach.

**Why Groq async, not blocking the tick loop?**
Groq's median response time is 1–3 seconds. Awaiting it inside a 100 ms loop would freeze the simulation. The Groq call fires asynchronously every 50 ticks; the result updates the AI allocator's weights when it lands, independently of the loop clock.

**Why Multi-Armed Bandit over DQN?**
A bandit converges visibly within a few hundred ticks — fast enough to show learning in a live demo. A DQN would need a replay buffer, state representation design, and a neural network, adding complexity with no visible payoff for a demonstration. NumPy-only also means zero heavy-ML dependencies.

**What would I do differently in v2?**
Sign session tokens with JWTs instead of bare UUID headers (currently session IDs are opaque — anyone who guesses one can view that session's metrics). Also move off Render's free tier to eliminate the 30–60 s cold-start delay, which is the largest UX friction point for first-time visitors.

---


---

## Running the RL Allocation Experiment

To evaluate the learning progression and multi-objective optimization headless across 3,000 ticks:

```bash
cd backend
python scripts/run_experiment.py
```

> **Note on Bandwidth Capacity:** The headless experiment uses `total_bandwidth = 20.0 Mbps` (differing from the UI's default 100 Mbps). The 4 user types generate between 6.6 Mbps and 34.0 Mbps total demand (average ~20.0 Mbps). Running at 20.0 Mbps ensures the network operates in a constrained regime where demand exceeds capacity in ~49% of ticks, providing a rigorous stress test for intelligent bandwidth allocation.
> Results are output to console and saved as `backend/scripts/experiment_results.csv`.

---

## Acknowledgements and Modifications

This project builds upon the open-source **NetPulse AI** platform originally authored by **Tanish Poddar** under the GNU General Public License v3.0.

In accordance with GPL-3.0 requirements, prominent notices have been added to all modified files. The following major enhancements were implemented:
1. **Network Utilization Metric:** Added network utilization tracking ($100 \times \sum \text{throughput} / \text{capacity}$) across backend models, engine calculations, rolling stats, live UI cards, banner, stats table, and a dedicated real-time chart.
2. **Multi-Objective RL Reward:** Re-engineered the RL bandit reward function to optimize both QoS and utilization: $J = 0.7 \times (\text{QoS}/100) + 0.3 \times (\text{utilization}/100)$, rewarding improvements relative to the baseline.
3. **Demand Capping & Leftover Redistribution (Water-fill):** Implemented a water-fill algorithm in `backend/allocators/utils.py` for AI and RL allocators so allocations are capped at actual demand and spare capacity is dynamically redistributed to unmet demands. The baseline allocator remains uncapped equal-split.
4. **Reproducible RL:** Added seeded random number generation using `numpy.random.default_rng` and per-generator seed offsets to eliminate correlations and ensure reproducible runs.
5. **Stateful Reset:** Guaranteed that resetting the engine wipes all Q-values, action counts, and epsilon schedules, restoring allocators and traffic generators to initial states.
6. **Graceful Explainability:** When `GROQ_API_KEY` is not provided, a rule-based insight engine synthesizes live RL learning statistics instead of a static placeholder.


