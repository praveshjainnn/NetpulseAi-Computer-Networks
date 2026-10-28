"use client";

import { useMemo } from "react";
import ThroughputChart from "./ThroughputChart";
import AllocationChart from "./AllocationChart";
import QoSBreakdownChart from "./QoSBreakdownChart";
import { NetworkState } from "@/hooks/useWebSocket";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartsSectionProps {
  history: NetworkState[];
}

export default function ChartsSection({ history }: ChartsSectionProps) {
  // Transform history data for allocation chart
  const allocationData = useMemo(() => {
    return history.map((state) => ({
      tick: state.tick,
      baseline_video: state.baseline_result.decision.allocations.video_streaming,
      baseline_gaming: state.baseline_result.decision.allocations.online_gaming,
      baseline_iot: state.baseline_result.decision.allocations.iot_devices,
      baseline_voip: state.baseline_result.decision.allocations.voip_messaging,
      ai_video: state.ai_result.decision.allocations.video_streaming,
      ai_gaming: state.ai_result.decision.allocations.online_gaming,
      ai_iot: state.ai_result.decision.allocations.iot_devices,
      ai_voip: state.ai_result.decision.allocations.voip_messaging,
      rl_video: state.rl_result?.decision.allocations.video_streaming,
      rl_gaming: state.rl_result?.decision.allocations.online_gaming,
      rl_iot: state.rl_result?.decision.allocations.iot_devices,
      rl_voip: state.rl_result?.decision.allocations.voip_messaging,
    }));
  }, [history]);

  // Transform history data for throughput chart
  const throughputData = useMemo(() => {
    return history.map((state) => ({
      tick: state.tick,
      baseline_video: state.baseline_result.metrics.video_streaming.throughput,
      baseline_gaming: state.baseline_result.metrics.online_gaming.throughput,
      baseline_iot: state.baseline_result.metrics.iot_devices.throughput,
      baseline_voip: state.baseline_result.metrics.voip_messaging.throughput,
      ai_video: state.ai_result.metrics.video_streaming.throughput,
      ai_gaming: state.ai_result.metrics.online_gaming.throughput,
      ai_iot: state.ai_result.metrics.iot_devices.throughput,
      ai_voip: state.ai_result.metrics.voip_messaging.throughput,
      rl_video: state.rl_result?.metrics.video_streaming.throughput,
      rl_gaming: state.rl_result?.metrics.online_gaming.throughput,
      rl_iot: state.rl_result?.metrics.iot_devices.throughput,
      rl_voip: state.rl_result?.metrics.voip_messaging.throughput,
    }));
  }, [history]);

  // QoS Breakdown data
  const qosBreakdownData = useMemo(() => {
    if (history.length === 0) return [];
    const latest = history[history.length - 1];
    return [
      {
        metric: "Throughput Score (40%)",
        baseline: latest.baseline_result.qos_score * 0.4,
        ai: latest.ai_result.qos_score * 0.4,
        rl: (latest.rl_result?.qos_score ?? 0) * 0.4,
      },
      {
        metric: "Latency Score (40%)",
        baseline: latest.baseline_result.qos_score * 0.4,
        ai: latest.ai_result.qos_score * 0.4,
        rl: (latest.rl_result?.qos_score ?? 0) * 0.4,
      },
      {
        metric: "Packet Retention (20%)",
        baseline: latest.baseline_result.qos_score * 0.2,
        ai: latest.ai_result.qos_score * 0.2,
        rl: (latest.rl_result?.qos_score ?? 0) * 0.2,
      },
    ];
  }, [history]);

  // Utilization over time series
  const utilizationData = useMemo(() => {
    return history.map((state) => ({
      tick: state.tick,
      baseline: state.baseline_result.utilization ?? 0,
      ai: state.ai_result.utilization ?? 0,
      rl: state.rl_result?.utilization ?? undefined,
    }));
  }, [history]);

  // QoS over time series
  const qosTimeSeries = useMemo(() => {
    return history.map((state) => ({
      tick: state.tick,
      baseline: state.baseline_result.qos_score ?? 0,
      ai: state.ai_result.qos_score ?? 0,
      rl: state.rl_result?.qos_score ?? undefined,
    }));
  }, [history]);

  const hasRL = history.some((s) => s.rl_result !== undefined);

  if (history.length === 0) {
    return (
      <div className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
          📊
        </div>
        <h4 className="text-sm font-semibold text-white">Telemetry Feed Idle</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Start the simulation above to stream real-time QoS progression, throughput curves, and network utilization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 2 Primary Performance Curves: QoS Score & Network Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. QoS Progression */}
        <div className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Quality of Service (QoS) Score
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Aggregate satisfaction score (0-100) per tick
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111c33] text-blue-300 border border-[#1e293b]">
              Live Feed
            </span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={qosTimeSeries} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="tick" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis domain={[50, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px" }}
                labelStyle={{ color: "#f8fafc" }}
                formatter={(value: number) => [`${value.toFixed(1)} / 100`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="Baseline" />
              <Line type="monotone" dataKey="ai" stroke="#818cf8" strokeWidth={1.8} dot={false} name="AI Waterfill" />
              {hasRL && (
                <Line type="monotone" dataKey="rl" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="RL Bandit" connectNulls />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Network Utilization */}
        <div className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Network Utilization Over Time
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Util % = 100 &times; &Sigma; min(allocated, demand) / total_bandwidth
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
              Capacity Eff.
            </span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={utilizationData} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="tick" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0d1527", border: "1px solid #1e293b", borderRadius: "8px" }}
                labelStyle={{ color: "#f8fafc" }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="Baseline" />
              <Line type="monotone" dataKey="ai" stroke="#818cf8" strokeWidth={1.8} dot={false} name="AI Waterfill" />
              {hasRL && (
                <Line type="monotone" dataKey="rl" stroke="#10b981" strokeWidth={2.5} dot={false} name="RL Bandit" connectNulls />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sub-charts: Bandwidth Allocation Breakdown & Throughput */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AllocationChart data={allocationData} />
        <ThroughputChart data={throughputData} />
      </div>
    </div>
  );
}
