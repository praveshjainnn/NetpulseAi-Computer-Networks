"use client";

import { useMemo } from "react";

interface AllocationData {
  video_streaming: number;
  online_gaming: number;
  iot_devices: number;
  voip_messaging: number;
}

interface RLAgentVisualizerProps {
  rlAllocations?: AllocationData;
  demands?: Record<string, { bandwidth_demand: number; latency_sensitivity: number }>;
  explorationRate?: number;
  rlQoS?: number;
  baselineQoS?: number;
  rlUtilization?: number;
  baselineUtilization?: number;
  tick?: number;
}

export default function RLAgentVisualizer({
  rlAllocations,
  demands,
  explorationRate = 0.15,
  rlQoS = 0,
  baselineQoS = 0,
  rlUtilization = 0,
  baselineUtilization = 0,
  tick = 0,
}: RLAgentVisualizerProps) {
  // Discrete arm options used by the bandit
  const weightArms = [0.5, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0];

  // User types in simulation
  const userTypes = [
    { key: "video_streaming", label: "Video Streaming", priority: "High Bandwidth (5-25 Mbps)", color: "from-sky-500 to-blue-600", dot: "bg-sky-400" },
    { key: "online_gaming", label: "Online Gaming", priority: "Latency Sensitive (1-5 Mbps)", color: "from-indigo-500 to-indigo-600", dot: "bg-indigo-400" },
    { key: "iot_devices", label: "IoT Devices", priority: "Low Demand (0.1-1 Mbps)", color: "from-amber-500 to-amber-600", dot: "bg-amber-400" },
    { key: "voip_messaging", label: "VoIP / Voice", priority: "Real-time Voice (0.5-3 Mbps)", color: "from-emerald-500 to-emerald-600", dot: "bg-emerald-400" },
  ];

  // Multi-objective reward delta J(RL) - J(Baseline)
  const jRL = 0.7 * (rlQoS / 100) + 0.3 * (rlUtilization / 100);
  const jBase = 0.7 * (baselineQoS / 100) + 0.3 * (baselineUtilization / 100);
  const rewardDelta = jRL - jBase;

  return (
    <div className="space-y-6">
      {/* Top Banner: Multi-Objective Reinforcement Learning Engine */}
      <div className="rounded-xl bg-gradient-to-r from-[#0d1c38] via-[#0f172a] to-[#0d1527] border border-blue-500/30 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Multi-Armed Bandit Q-Learning Agent
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                &epsilon;-Greedy Strategy
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Learns optimal bandwidth priority weights across 4 user traffic types. Uses an iterative water-fill algorithm to strictly cap allocations at demand and redistribute spare capacity.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            <div className="px-3.5 py-2 rounded-lg bg-[#080c14] border border-[#1e293b] text-center">
              <div className="text-[10px] text-slate-400 font-medium">Exploration (&epsilon;)</div>
              <div className="text-lg font-bold font-mono text-blue-400">{explorationRate.toFixed(3)}</div>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-[#080c14] border border-[#1e293b] text-center">
              <div className="text-[10px] text-slate-400 font-medium">Reward Delta (&Delta;J)</div>
              <div className={`text-lg font-bold font-mono ${rewardDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {rewardDelta >= 0 ? `+${rewardDelta.toFixed(4)}` : rewardDelta.toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Objective Formulation Formula Banner */}
        <div className="mt-4 pt-4 border-t border-[#1e293b] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-[#080c14]/70 border border-[#1e293b]/70">
            <span className="text-slate-400 font-medium">Reward Function:</span>
            <div className="font-mono text-blue-300 font-semibold mt-0.5">
              R = J(RL) &minus; J(Baseline)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#080c14]/70 border border-[#1e293b]/70">
            <span className="text-slate-400 font-medium">Objective Weighting:</span>
            <div className="font-mono text-slate-200 mt-0.5">
              J = <span className="text-blue-400">0.7 &times; (QoS/100)</span> + <span className="text-emerald-400">0.3 &times; (Util/100)</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#080c14]/70 border border-[#1e293b]/70">
            <span className="text-slate-400 font-medium">Q-Value Update Rule:</span>
            <div className="font-mono text-indigo-300 mt-0.5">
              Q(s, a) &larr; Q(s, a) + 0.1 &times; [R &minus; Q(s, a)]
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 4 Traffic Types Arm Selection & Waterfill Redistribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {userTypes.map((ut) => {
          const alloc = rlAllocations ? (rlAllocations as any)[ut.key] || 0 : 0;
          const demand = demands && demands[ut.key] ? demands[ut.key].bandwidth_demand : 0;
          const eff = demand > 0 ? Math.min(100, (alloc / demand) * 100) : 100;

          return (
            <div
              key={ut.key}
              className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-5 shadow-lg relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${ut.dot}`} />
                    <h3 className="font-bold text-white text-sm">{ut.label}</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{ut.priority}</span>
                </div>

                {/* Demand vs Allocated Live Telemetry */}
                <div className="grid grid-cols-3 gap-3 my-4">
                  <div className="p-2.5 rounded-lg bg-[#080c14] border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400">Current Demand</span>
                    <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                      {demand.toFixed(2)} <span className="text-xs font-normal text-slate-500">Mbps</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#080c14] border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400">RL Allocation</span>
                    <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                      {alloc.toFixed(2)} <span className="text-xs font-normal text-slate-500">Mbps</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#080c14] border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400">Satisfaction</span>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                      {eff.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Normal Line Filling Meter with Percentage */}
                <div className="space-y-1.5 my-3 p-3 rounded-lg bg-[#080c14]/80 border border-[#1e293b]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Allocation Meter</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-400 text-[11px]">
                        {alloc.toFixed(2)} / {demand.toFixed(2)} Mbps
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        eff >= 100 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                          : eff >= 75 
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" 
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {eff.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Line Filling Meter Bar */}
                  <div className="relative w-full h-3.5 rounded-full bg-[#162032] overflow-hidden border border-[#1e293b]/80 shadow-inner">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${ut.color} transition-all duration-500 relative flex items-center justify-end pr-1`}
                      style={{ width: `${Math.min(100, Math.max(0, eff))}%` }}
                    />
                  </div>

                  {/* Percentage Scale */}
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span className={eff >= 100 ? "text-emerald-400 font-bold" : ""}>100%</span>
                  </div>
                </div>

                {/* Arm Selection Matrix */}
                <div className="mt-4 pt-3 border-t border-[#1e293b]">
                  <span className="text-[11px] text-slate-400 font-medium block mb-2">
                    Bandit Action Arms (Priority Weight Factor):
                  </span>
                  <div className="grid grid-cols-7 gap-1.5">
                    {weightArms.map((w) => {
                      const isEstimatedBest = w >= 1.0 && w <= 1.5;
                      return (
                        <div
                          key={w}
                          className={`py-1.5 px-1 text-center rounded text-xs font-mono border transition-all ${
                            isEstimatedBest
                              ? "bg-blue-600/20 border-blue-500/40 text-blue-300 font-bold"
                              : "bg-[#080c14] border-[#1e293b] text-slate-400"
                          }`}
                        >
                          {w.toFixed(1)}&times;
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 text-[10px] text-slate-500 border-t border-[#1e293b] flex items-center justify-between">
                <span>Adaptive Arm Exploration</span>
                <span className="text-emerald-400 font-mono">No Starvation Guard Active</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
