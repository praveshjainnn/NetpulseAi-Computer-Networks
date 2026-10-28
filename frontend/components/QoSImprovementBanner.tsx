"use client";

interface QoSImprovementBannerProps {
  baselineQoS: number;
  aiQoS: number;
  rlQoS?: number;
  baselineUtilization?: number;
  aiUtilization?: number;
  rlUtilization?: number;
}

export default function QoSImprovementBanner({
  baselineQoS,
  aiQoS,
  rlQoS,
  baselineUtilization = 0,
  aiUtilization = 0,
  rlUtilization = 0,
}: QoSImprovementBannerProps) {
  const rlImprovement = rlQoS !== undefined && baselineQoS > 0 ? ((rlQoS - baselineQoS) / baselineQoS) * 100 : null;
  const utilImprovement = rlUtilization - baselineUtilization;

  return (
    <div className="rounded-xl bg-gradient-to-r from-[#0d1c38] via-[#0f172a] to-[#0d1527] border border-blue-500/30 p-5 shadow-xl relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left: Summary Title & Subtext */}
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Live Optimization Telemetry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Reinforcement learning multi-objective policy compared against the traditional static equal-split baseline.
          </p>
        </div>

        {/* Center: KPI Comparison Pillars */}
        <div className="flex items-center gap-6 sm:gap-10 flex-wrap justify-center">
          {/* Baseline Pillar */}
          <div className="text-center">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Baseline
            </div>
            <div className="text-2xl font-bold font-mono text-slate-300">
              {baselineQoS.toFixed(1)}
            </div>
            <div className="text-xs font-mono text-slate-500 mt-0.5">
              Util: {baselineUtilization.toFixed(1)}%
            </div>
          </div>

          <div className="text-slate-600 font-bold text-sm hidden sm:block">&rarr;</div>

          {/* AI Heuristic Pillar */}
          <div className="text-center">
            <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              AI Waterfill
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-300">
              {aiQoS.toFixed(1)}
            </div>
            <div className="text-xs font-mono text-indigo-400/80 mt-0.5">
              Util: {aiUtilization.toFixed(1)}%
            </div>
          </div>

          <div className="text-slate-600 font-bold text-sm hidden sm:block">&rarr;</div>

          {/* RL Bandit Pillar */}
          <div className="text-center p-2.5 px-4 rounded-xl bg-blue-500/10 border border-blue-400/30 shadow-inner">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <span>RL Bandit</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-white">
              {(rlQoS ?? 0).toFixed(1)}
            </div>
            <div className="text-xs font-mono text-emerald-400 font-medium mt-0.5">
              Util: {(rlUtilization ?? 0).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Right: Net Gain Pills */}
        <div className="flex flex-row lg:flex-col gap-2 text-center lg:text-right">
          <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <div className="text-[10px] text-blue-300 uppercase tracking-wider">QoS Gain</div>
            <div className="text-sm font-bold font-mono text-blue-200">
              {rlImprovement !== null ? `+${rlImprovement.toFixed(1)}%` : "--"}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <div className="text-[10px] text-emerald-300 uppercase tracking-wider">Utilization Gain</div>
            <div className="text-sm font-bold font-mono text-emerald-200">
              {utilImprovement >= 0 ? `+${utilImprovement.toFixed(1)}%` : `${utilImprovement.toFixed(1)}%`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
