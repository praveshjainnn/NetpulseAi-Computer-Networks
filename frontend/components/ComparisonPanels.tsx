"use client";

interface AllocationData {
  video_streaming: number;
  online_gaming: number;
  iot_devices: number;
  voip_messaging: number;
}

interface ComparisonPanelsProps {
  baselineAllocations: AllocationData;
  aiAllocations: AllocationData;
  rlAllocations?: AllocationData;
  baselineQoS: number;
  aiQoS: number;
  rlQoS?: number;
  baselineUtilization?: number;
  aiUtilization?: number;
  rlUtilization?: number;
  tick: number;
  explorationRate?: number;
}

export default function ComparisonPanels({
  baselineAllocations,
  aiAllocations,
  rlAllocations,
  baselineQoS,
  aiQoS,
  rlQoS,
  baselineUtilization = 0,
  aiUtilization = 0,
  rlUtilization = 0,
  tick,
  explorationRate,
}: ComparisonPanelsProps) {
  // Compute multi-objective J = 0.7 * (QoS/100) + 0.3 * (Util/100)
  const calcJ = (qos: number, util: number) => {
    return 0.7 * (qos / 100) + 0.3 * (util / 100);
  };

  const baselineJ = calcJ(baselineQoS, baselineUtilization);
  const aiJ = calcJ(aiQoS, aiUtilization);
  const rlJ = rlQoS !== undefined ? calcJ(rlQoS, rlUtilization) : 0;

  const qosGainRL = rlQoS !== undefined && baselineQoS > 0 ? ((rlQoS - baselineQoS) / baselineQoS) * 100 : 0;
  const utilGainRL = rlUtilization - baselineUtilization;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* 1. Baseline Equal-Split Card */}
      <div className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-5 shadow-lg relative flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <h3 className="font-semibold text-slate-200 text-sm tracking-wide">
              Traditional Equal-Split
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
            Static Policy
          </span>
        </div>

        {/* Primary KPI Metrics */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-lg bg-[#080c14] border border-[#1e293b]">
            <span className="text-[11px] text-slate-400 font-medium">QoS Score</span>
            <div className="text-2xl font-bold font-mono text-slate-200 mt-1">
              {baselineQoS.toFixed(1)}
              <span className="text-xs text-slate-500 font-normal"> / 100</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#080c14] border border-[#1e293b]">
            <span className="text-[11px] text-slate-400 font-medium">Network Util</span>
            <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
              {baselineUtilization.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Objective & Allocation Info */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-[#1e293b]/60">
            <span>Combined Objective (J):</span>
            <span className="font-mono text-slate-200 font-medium">{baselineJ.toFixed(4)}</span>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Streaming: <span className="text-slate-200 font-mono">{baselineAllocations?.video_streaming?.toFixed(1) || 0} Mbps</span></span>
              <span>Gaming: <span className="text-slate-200 font-mono">{baselineAllocations?.online_gaming?.toFixed(1) || 0} Mbps</span></span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>IoT Devices: <span className="text-slate-200 font-mono">{baselineAllocations?.iot_devices?.toFixed(1) || 0} Mbps</span></span>
              <span>VoIP Voice: <span className="text-slate-200 font-mono">{baselineAllocations?.voip_messaging?.toFixed(1) || 0} Mbps</span></span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2 text-[10px] text-slate-500 border-t border-[#1e293b] flex items-center justify-between">
          <span>Uncapped 25% capacity allocation</span>
          <span className="text-slate-400 font-mono">Control Baseline</span>
        </div>
      </div>

      {/* 2. AI Heuristic Waterfill Card */}
      <div className="rounded-xl bg-[#0d1527] border border-indigo-900/40 p-5 shadow-lg relative flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <h3 className="font-semibold text-indigo-200 text-sm tracking-wide">
              AI Heuristic (Waterfill)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
            Demand-Capped
          </span>
        </div>

        {/* Primary KPI Metrics */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-lg bg-[#080c14] border border-[#1e293b]">
            <span className="text-[11px] text-slate-400 font-medium">QoS Score</span>
            <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">
              {aiQoS.toFixed(1)}
              <span className="text-xs text-indigo-400/80 font-normal ml-1">
                (+{(aiQoS - baselineQoS).toFixed(1)})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#080c14] border border-[#1e293b]">
            <span className="text-[11px] text-slate-400 font-medium">Network Util</span>
            <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">
              {aiUtilization.toFixed(1)}%
              <span className="text-xs text-emerald-400 font-normal ml-1">
                (+{(aiUtilization - baselineUtilization).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Objective & Allocation Info */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-[#1e293b]/60">
            <span>Combined Objective (J):</span>
            <span className="font-mono text-indigo-200 font-medium">{aiJ.toFixed(4)}</span>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Streaming: <span className="text-indigo-200 font-mono">{aiAllocations?.video_streaming?.toFixed(1) || 0} Mbps</span></span>
              <span>Gaming: <span className="text-indigo-200 font-mono">{aiAllocations?.online_gaming?.toFixed(1) || 0} Mbps</span></span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>IoT Devices: <span className="text-indigo-200 font-mono">{aiAllocations?.iot_devices?.toFixed(1) || 0} Mbps</span></span>
              <span>VoIP Voice: <span className="text-indigo-200 font-mono">{aiAllocations?.voip_messaging?.toFixed(1) || 0} Mbps</span></span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2 text-[10px] text-slate-500 border-t border-[#1e293b] flex items-center justify-between">
          <span>Priority weights + Leftover redistribution</span>
          <span className="text-indigo-400 font-mono">Expert Rules</span>
        </div>
      </div>

      {/* 3. RL Multi-Armed Bandit Agent Card (Highlighted Primary Strategy) */}
      <div className="rounded-xl bg-gradient-to-b from-[#0d1c38] to-[#0a1426] border-2 border-blue-500/50 p-5 shadow-xl shadow-blue-950/40 relative flex flex-col justify-between overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 border-b border-blue-500/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <h3 className="font-bold text-white text-sm tracking-wide">
              RL Adaptive Agent (Bandit)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-400/40">
            Q-Learning Active
          </span>
        </div>

        {/* Primary KPI Metrics */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-lg bg-[#080c14]/90 border border-blue-500/30">
            <span className="text-[11px] text-blue-300 font-medium">QoS Score</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {(rlQoS ?? 0).toFixed(1)}
              <span className="text-xs text-blue-400 font-semibold ml-1">
                {qosGainRL >= 0 ? `+${qosGainRL.toFixed(1)}%` : `${qosGainRL.toFixed(1)}%`}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#080c14]/90 border border-blue-500/30">
            <span className="text-[11px] text-blue-300 font-medium">Network Util</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {(rlUtilization ?? 0).toFixed(1)}%
              <span className="text-xs text-emerald-300 font-semibold ml-1">
                {utilGainRL >= 0 ? `+${utilGainRL.toFixed(1)}%` : `${utilGainRL.toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Objective & Allocation Info */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-blue-200 pt-1 border-t border-blue-500/20">
            <span>Multi-Objective (J):</span>
            <span className="font-mono text-white font-bold">{rlJ.toFixed(4)}</span>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>Streaming: <span className="text-white font-mono font-medium">{rlAllocations?.video_streaming?.toFixed(1) || 0} Mbps</span></span>
              <span>Gaming: <span className="text-white font-mono font-medium">{rlAllocations?.online_gaming?.toFixed(1) || 0} Mbps</span></span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>IoT Devices: <span className="text-white font-mono font-medium">{rlAllocations?.iot_devices?.toFixed(1) || 0} Mbps</span></span>
              <span>VoIP Voice: <span className="text-white font-mono font-medium">{rlAllocations?.voip_messaging?.toFixed(1) || 0} Mbps</span></span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2 text-[10px] text-blue-300/80 border-t border-blue-500/20 flex items-center justify-between">
          <span>Exploration rate (&epsilon;): <span className="font-mono text-white">{(explorationRate ?? 0.15).toFixed(3)}</span></span>
          <span className="text-emerald-400 font-medium font-mono">Target Optimized</span>
        </div>
      </div>
    </div>
  );
}
