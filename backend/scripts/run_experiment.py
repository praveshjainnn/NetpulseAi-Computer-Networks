"""
Headless experiment script for AI-Based Intelligent Bandwidth Allocation Using RL.

# MODIFIED: 2026-10-09
#   Updated for AI-Based Intelligent Bandwidth Allocation Using RL project.
#   Headless 3000-tick run (seed=42). Bandwidth set to 20.0 Mbps so total demand
#   exceeds capacity in ~48.4% of ticks (40-70% stress test). Tracks QoS,
#   utilization, J combined objective, learning progression (first vs last 500),
#   and per-app allocation efficiency to verify no app starvation.

Usage:
    cd backend
    python scripts/run_experiment.py
"""

import asyncio
import csv
import os
import sys
import time
from typing import Dict, List

# ---- ensure the backend package root is on sys.path ----
_HERE = os.path.dirname(__file__)
_BACKEND = os.path.abspath(os.path.join(_HERE, ".."))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from models import SimulationConfig, UserType
from simulator.engine import SimulationEngine

# ─── Experiment parameters ────────────────────────────────────────────────────
TICKS = 3000
SEED = 42
# 20.0 Mbps: typical total demand across all 4 user types has mean ~20.0 Mbps (6.6–34.0 Mbps range).
# Total demand exceeds 20.0 Mbps in ~48.4% of ticks (satisfies the 40-70% brief requirement).
TOTAL_BANDWIDTH = 20.0
WINDOW = 500   # first / last window for learning analysis


async def run() -> None:
    config = SimulationConfig(
        total_bandwidth=TOTAL_BANDWIDTH,
        base_latency=10.0,
        congestion_factor=1.5,
        packet_loss_rate=2.0,
        random_seed=SEED,
    )

    engine = SimulationEngine(config, groq_api_key=None)

    # Accumulators
    ticks_over_capacity = 0

    bl_qos: List[float] = []
    ai_qos: List[float] = []
    rl_qos: List[float] = []
    bl_util: List[float] = []
    ai_util: List[float] = []
    rl_util: List[float] = []

    # Per-user-type allocation efficiencies for RL, AI, Baseline
    rl_app_eff: Dict[UserType, List[float]] = {ut: [] for ut in UserType}
    ai_app_eff: Dict[UserType, List[float]] = {ut: [] for ut in UserType}
    bl_app_eff: Dict[UserType, List[float]] = {ut: [] for ut in UserType}

    # J(r) = 0.7*(qos/100) + 0.3*(util/100)
    W_QOS, W_UTIL = 0.7, 0.3

    def J(qos: float, util: float) -> float:
        return W_QOS * (qos / 100.0) + W_UTIL * (util / 100.0)

    print(f"Running {TICKS} ticks  seed={SEED}  bandwidth={TOTAL_BANDWIDTH} Mbps …")
    t0 = time.perf_counter()

    for _ in range(TICKS):
        state = await engine._simulation_tick()

        total_demand = sum(d.bandwidth_demand for d in state.demands.values())
        if total_demand > TOTAL_BANDWIDTH:
            ticks_over_capacity += 1

        bl = state.baseline_result
        ai = state.ai_result
        rl = state.rl_result

        bl_qos.append(bl.qos_score)
        ai_qos.append(ai.qos_score)
        bl_util.append(bl.utilization)
        ai_util.append(ai.utilization)

        for ut in UserType:
            if ut in bl.metrics:
                bl_app_eff[ut].append(bl.metrics[ut].allocation_efficiency)
            if ut in ai.metrics:
                ai_app_eff[ut].append(ai.metrics[ut].allocation_efficiency)

        if rl is not None:
            rl_qos.append(rl.qos_score)
            rl_util.append(rl.utilization)
            for ut in UserType:
                if ut in rl.metrics:
                    rl_app_eff[ut].append(rl.metrics[ut].allocation_efficiency)

    elapsed = time.perf_counter() - t0
    print(f"Done in {elapsed:.1f}s  ({TICKS/elapsed:.0f} ticks/s)")

    over_pct = 100.0 * ticks_over_capacity / TICKS
    print(f"Ticks with demand > capacity: {ticks_over_capacity}/{TICKS} ({over_pct:.1f}%)")
    print()

    # RL learning stats
    rl_stats = engine.rl_allocator.get_learning_stats()
    final_epsilon = rl_stats["exploration_rate"]
    best_weights = rl_stats["best_weights_found"]
    avg_reward = rl_stats["avg_reward"]

    def window_stats(series: List[float], w: int):
        first = series[:w] if len(series) >= w else series
        last = series[-w:] if len(series) >= w else series
        return (
            sum(first) / len(first) if first else 0.0,
            sum(last) / len(last) if last else 0.0,
        )

    # Build result rows
    rows = []
    for name, qos_list, util_list in [
        ("Baseline", bl_qos, bl_util),
        ("AI",       ai_qos, ai_util),
        ("RL",       rl_qos, rl_util),
    ]:
        if not qos_list:
            continue
        mean_qos  = sum(qos_list) / len(qos_list)
        mean_util = sum(util_list) / len(util_list)
        mean_J    = J(mean_qos, mean_util)
        q_f, q_l  = window_stats(qos_list, WINDOW)
        u_f, u_l  = window_stats(util_list, WINDOW)
        rows.append({
            "Strategy":        name,
            "Mean_QoS":        round(mean_qos, 3),
            "Mean_Util_%":     round(mean_util, 3),
            "Mean_J":          round(mean_J, 4),
            "First500_QoS":    round(q_f, 3),
            "Last500_QoS":     round(q_l, 3),
            "First500_Util_%": round(u_f, 3),
            "Last500_Util_%":  round(u_l, 3),
        })

    # Print table
    headers = list(rows[0].keys())
    col_w = {h: max(len(h), max(len(str(r[h])) for r in rows)) + 2 for h in headers}

    header_line = "  ".join(h.ljust(col_w[h]) for h in headers)
    sep_line    = "  ".join("-" * col_w[h] for h in headers)
    print(header_line)
    print(sep_line)
    for r in rows:
        print("  ".join(str(r[h]).ljust(col_w[h]) for h in headers))

    print()
    print(f"RL final exploration rate : {final_epsilon:.4f}")
    print(f"RL avg reward (J-delta)   : {avg_reward:.4f}")
    readable_weights = {ut.value: w for ut, w in best_weights.items()}
    print(f"RL best weights found     : {readable_weights}")
    print()

    # Per-app allocation efficiency (verify no starvation)
    print("Per-App Allocation Efficiency (Mean and Minimum over 3000 ticks):")
    print(f"{'User Type':<20} {'RL Mean':<12} {'RL Min':<12} {'AI Mean':<12} {'AI Min':<12} {'Baseline Mean':<14} {'Baseline Min':<12}")
    print("-" * 96)
    for ut in UserType:
        rl_m = sum(rl_app_eff[ut]) / len(rl_app_eff[ut]) if rl_app_eff[ut] else 0.0
        rl_min = min(rl_app_eff[ut]) if rl_app_eff[ut] else 0.0
        ai_m = sum(ai_app_eff[ut]) / len(ai_app_eff[ut]) if ai_app_eff[ut] else 0.0
        ai_min = min(ai_app_eff[ut]) if ai_app_eff[ut] else 0.0
        bl_m = sum(bl_app_eff[ut]) / len(bl_app_eff[ut]) if bl_app_eff[ut] else 0.0
        bl_min = min(bl_app_eff[ut]) if bl_app_eff[ut] else 0.0
        print(f"{ut.value:<20} {rl_m:<12.3f} {rl_min:<12.3f} {ai_m:<12.3f} {ai_min:<12.3f} {bl_m:<14.3f} {bl_min:<12.3f}")

    print()
    all_rl_mins = [min(rl_app_eff[ut]) for ut in UserType if rl_app_eff[ut]]
    print(f"Absolute minimum RL allocation efficiency across all apps and ticks: {min(all_rl_mins):.4f}")
    if min(all_rl_mins) > 0.0:
        print("[OK] Verified: No application is starved to zero under RL.")

    # Save CSV
    out_path = os.path.join(_HERE, "experiment_results.csv")
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
    print(f"\nResults saved to: {out_path}")


if __name__ == "__main__":
    asyncio.run(run())
