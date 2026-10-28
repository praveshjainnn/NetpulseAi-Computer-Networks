# Changes and Audit Log

## Target Problem Statement
> Traditional bandwidth allocation policies cannot efficiently satisfy diverse application requirements. Develop a reinforcement learning-based bandwidth allocation framework that optimizes Quality of Service while **maximizing network utilization**.

This log documents all audits, baseline tests, reconstructed files, and architectural modifications made to adapt NetPulse AI to this problem statement under GNU General Public License v3.0.

---

## Phase 0 — Baseline Test Status (Pre-Modification Audit)

- **Date:** 2026-10-09
- **Environment:** Windows, Python 3.12, Node.js v20+
- **Backend Initial Test Status:**
  - Original zip contained no unit tests directory (`backend/tests/` was empty or missing).
  - Backend dependencies verified against `requirements.txt`: FastAPI, Uvicorn, Pydantic, NumPy, HTTPx.
  - Zero-Credential Verification:
    - Backend starts with **no** `GROQ_API_KEY` and **no** Supabase credentials.
    - System degrades gracefully: Groq layer runs in disabled mode; Supabase persistence gracefully disabled.
- **Frontend Initial Status:**
  - `package.json`, `tsconfig.json`, and `frontend/lib/` were missing from the zip due to `.gitignore` rules.

---

## Phase 0.5 — Reconstructed Frontend Files

Because the zip archive was missing build configurations and `@/lib` utilities, the following files were reconstructed to restore full App Router functionality:

1. `frontend/package.json`
   - Configured Next.js 15, React 18/19, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/postcss`), Recharts 2, Jest, React Testing Library.
   - Scripts: `dev`, `build`, `start`, `lint`, `test`.
2. `frontend/tsconfig.json`
   - Configured TypeScript compiler options and path aliases (`@/*` -> `./*`).
3. `frontend/lib/api.ts`
   - Type definitions: `SimulationConfig` (`total_bandwidth`, `base_latency`, `congestion_factor`, `packet_loss_rate`, `random_seed`).
   - Functions: `startSimulation`, `stopSimulation`, `deleteSession`, `getStatus`, `getSessionId`, `clearSessionId`.
   - LocalStorage session tracking and `X-Session-Id` header handling.
4. `frontend/lib/statisticsHighlighting.ts`
   - Statistical helper functions (`formatNumber`, highlighting functions) consumed by `StatisticsTable.tsx`.
5. `frontend/eslint.config.mjs`
   - ESLint flat configuration adjusted for ESM resolution.

**Phase 0.5 Verification:** `npm run build` succeeds and produces static routes (`/`, `/dashboard`, `/history`, `/how-it-works`).

---

## Phase 1 — Change 1: Network Utilization Metric

- **Formula:**
  $$\text{utilization\_pct} = 100 \times \frac{\sum_{\text{user types}} \text{throughput}}{\text{total\_bandwidth}}$$
  where $\text{throughput} = \min(\text{allocated}, \text{demand})$ per user type. Wasted over-allocation is not counted.
- **Backend Changes:**
  - `backend/models.py`:
    - Added `utilization: float = Field(default=0.0, ge=0.0, le=100.0)` to `AllocationResult`.
    - Added `avg_utilization: float = Field(default=0.0, ge=0.0, le=100.0)` to `AllocatorStatistics`.
  - `backend/simulator/engine.py`:
    - Updated `_calculate_allocation_result`: computes network utilization based on achieved throughput over capacity and stores in `AllocationResult`.
  - `backend/metrics/collector.py`:
    - Added rolling-window calculation of `avg_utilization` in `get_rolling_statistics()`.
- **Frontend Changes:**
  - `frontend/hooks/useWebSocket.ts`:
    - Added `utilization` to `AllocationResult` and `avg_utilization` to `AllocatorStatistics`.
  - `frontend/components/ComparisonPanels.tsx`:
    - Added live Network Utilization percentage metric to all three strategy cards (Baseline, AI Heuristic, RL Bandit).
  - `frontend/components/QoSImprovementBanner.tsx`:
    - Added live utilization percentage alongside QoS scores and relative gains.
  - `frontend/components/StatisticsTable.tsx`:
    - Added rolling-average Utilization row (last 50 ticks) for all three strategies.
  - `frontend/components/ChartsSection.tsx`:
    - Added real-time "Network Utilization Over Time" line chart below existing QoS charts.

---

## Phase 2 — Change 2: RL Reward Multi-Objective Function

- **Formula:**
  $$J(\text{result}) = W_{\text{QoS}} \times \left(\frac{\text{qos\_score}}{100}\right) + W_{\text{UTIL}} \times \left(\frac{\text{utilization}}{100}\right)$$
  $$\text{reward} = J(\text{rl\_result}) - J(\text{baseline\_result})$$
  with $W_{\text{QoS}} = 0.7$ and $W_{\text{UTIL}} = 0.3$.
- **Backend Changes:**
  - `backend/allocators/rl_allocator.py`:
    - Added named constants `W_QOS = 0.7` and `W_UTIL = 0.3`.
    - Modified `RLAllocator.update(rl_result, baseline_result)` to calculate multi-objective performance $J$ and reward delta.
    - Updated Q-value updates and learning statistics descriptions.
  - `backend/simulator/engine.py`:
    - Updated tick execution loop (~line 270) to pass `AllocationResult` objects to `rl_allocator.update()`.

---

## Phase 3 — Change 3: Water-Fill Demand Capping & Capacity Redistribution

- **Algorithm:**
  1. Distribute bandwidth capacity proportionally to strategy priority weights.
  2. Cap each user type's allocation at its actual current demand; harvest leftover capacity.
  3. Proportionally redistribute leftover capacity among user types still below demand.
  4. Repeat until all demands are met or total capacity is exhausted.
  5. Rounding guard ensures total allocated bandwidth never exceeds total capacity.
- **Backend Changes:**
  - Created `backend/allocators/utils.py` containing `waterfill(weights, demands, capacity)`.
  - `backend/allocators/ai_allocator.py`:
    - Updated `allocate()` to use `waterfill()` instead of single-pass uncapped division.
  - `backend/allocators/rl_allocator.py`:
    - Updated `allocate()` to use `waterfill()` instead of single-pass uncapped division.
  - `backend/allocators/baseline.py`:
    - **Untouched** (retains equal split policy without capping as the traditional control baseline).

---

## Phase 4 — Change 4: Reproducible RL & Traffic Generation

- **Backend Changes:**
  - `backend/allocators/rl_allocator.py`:
    - Added `seed: Optional[int] = None` to `RLAllocator.__init__`.
    - Initialized `self._rng = np.random.default_rng(seed)`.
    - Replaced calls to `np.random.random()` and `np.random.randint()` with `self._rng.random()` and `self._rng.integers()`.
  - `backend/simulator/engine.py`:
    - Passes `config.random_seed` to `RLAllocator`.
    - Implemented per-type seed derivation `seed + index` (0: Video, 1: Gaming, 2: IoT, 3: VoIP) to avoid cross-stream correlation.

---

## Phase 5 — Change 5: Reset Restores Initial Learning State

- **Backend Changes:**
  - `backend/simulator/engine.py`:
    - In `SimulationEngine.reset()`:
      - Re-creates `self.rl_allocator = RLAllocator(seed=self.config.random_seed)` (resets Q-values, action counts, epsilon schedule).
      - Re-initializes `self.traffic_generators` with initial per-type seeds so traffic demands repeat identically.
      - Resets `self.ai_allocator = AIAllocator()` priority weights to defaults.
      - Resets `self.baseline_allocator = BaselineAllocator()`.
      - Resets `self.metrics_collector = MetricsCollector(window_size=100)`.

---

## Phase 6 — Headless Experiment Script

- **File:** `backend/scripts/run_experiment.py`
  - Runs 3000 ticks headless with `seed=42`.
  - Bandwidth set to `20.0 Mbps` (mean total demand is ~20.0 Mbps, causing demand to exceed capacity in 49.0% of ticks, falling within the 40-70% stress test requirement).
  - Tracks QoS, utilization, multi-objective score $J$, first 500 vs last 500 ticks, exploration rate, best weights found, and per-application allocation efficiency.
  - Verifies that no application is starved to zero under RL.
  - Automatically exports results to `backend/scripts/experiment_results.csv`.

---

## Phase 7 — Unit & Regression Tests

- **File:** `backend/tests/test_changes.py` (19 comprehensive unit tests covering all 5 changes)
  - `TestUtilizationMetric`:
    - `test_utilization_formula_basic`
    - `test_utilization_wasted_allocation_not_counted`
    - `test_utilization_zero_capacity_or_demand`
    - `test_utilization_in_engine_tick`
  - `TestRewardFormula`:
    - `test_reward_changes_with_utilization`
    - `test_reward_regression_to_qos_when_w_util_zero`
    - `test_reward_positive_when_rl_better`
  - `TestWaterfill`:
    - `test_allocations_never_exceed_demand`
    - `test_allocations_non_negative`
    - `test_total_never_exceeds_capacity`
    - `test_demand_less_than_capacity_all_satisfied`
    - `test_demand_greater_than_capacity_full_capacity_used`
    - `test_redistributes_spare_capacity`
  - `TestSeedDeterminism`:
    - `test_rl_allocator_deterministic_with_seed`
    - `test_engine_ticks_deterministic_with_seed`
    - `test_same_seed_same_results` (500 ticks)
  - `TestResetRestoresState`:
    - `test_reset_then_same_results`
    - `test_rl_epsilon_resets`
    - `test_ai_weights_reset`

**Test Status:** 19/19 passing.
