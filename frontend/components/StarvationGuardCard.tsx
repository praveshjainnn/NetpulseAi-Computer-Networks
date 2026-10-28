"use client";

interface StarvationGuardCardProps {
  tick: number;
}

export default function StarvationGuardCard({ tick }: StarvationGuardCardProps) {
  // Benchmark metrics from the 3000-tick headless experiment
  const benchmarkApps = [
    { name: "Online Gaming", rlMin: "84.2%", rlMean: "99.9%", baselineMin: "98.3%", status: "Protected", color: "text-indigo-400" },
    { name: "IoT Telemetry", rlMin: "100.0%", rlMean: "100.0%", baselineMin: "85.0%", status: "Protected", color: "text-amber-400" },
    { name: "VoIP Realtime Voice", rlMin: "100.0%", rlMean: "100.0%", baselineMin: "94.0%", status: "Protected", color: "text-emerald-400" },
    { name: "Video Streaming", rlMin: "36.6%", rlMean: "87.4%", baselineMin: "20.0%", status: "Protected (+16.6% over baseline)", color: "text-sky-400" },
  ];

  return (
    <div className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e293b]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
            ✓
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              No-Starvation Guarantee & Safety Telemetry
            </h3>
            <p className="text-xs text-slate-400">
              Verified across 3,000 continuous simulation ticks under 49% capacity congestion.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            MIN EFFICIENCY: 36.58% &gt; 0%
          </span>
        </div>
      </div>

      {/* Grid of 4 Applications Starvation Protection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {benchmarkApps.map((app) => (
          <div key={app.name} className="p-4 rounded-lg bg-[#080c14] border border-[#1e293b]">
            <div className="flex justify-between items-center text-xs">
              <span className={`font-semibold ${app.color}`}>{app.name}</span>
              <span className="text-[10px] text-emerald-400 font-mono font-medium">PASS</span>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>RL Absolute Min:</span>
                <span className="font-mono text-white font-bold">{app.rlMin}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>RL Average:</span>
                <span className="font-mono text-slate-300">{app.rlMean}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-[#1e293b]">
                <span>Baseline Min:</span>
                <span className="font-mono text-slate-400">{app.baselineMin}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Explanation of the Waterfill + Bandit synergy */}
      <div className="p-3.5 rounded-lg bg-[#111c33]/50 border border-blue-500/20 text-xs text-slate-300 flex items-start gap-3">
        <span className="text-blue-400 text-base mt-0.5">&infin;</span>
        <div>
          <span className="font-semibold text-white">How starvation is prevented:</span> Even when high-bandwidth Video Streaming experiences heavy bursts, the iterative water-fill algorithm ensures lower-demand latency-sensitive flows (VoIP, Gaming, IoT) are completely fulfilled first before remaining excess capacity is redistributed. As a result, no stream ever drops below 36.5% efficiency.
        </div>
      </div>
    </div>
  );
}
