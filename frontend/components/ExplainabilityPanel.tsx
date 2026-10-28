"use client";

interface ExplainabilityPanelProps {
  explanation: string | null | undefined;
  timestamp: number | null | undefined;
}

export default function ExplainabilityPanel({
  explanation,
  timestamp,
}: ExplainabilityPanelProps) {
  const formatTimestamp = (ts: number | null | undefined): string => {
    if (!ts) return "N/A";
    const date = new Date(ts * 1000);
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-5 shadow-lg relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
            🧠
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              AI Decision Explainability &amp; Reasoning Feed
            </h3>
            <p className="text-[11px] text-slate-400">
              Natural language explanation of priority weights and waterfill demand reallocation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
            Groq Llama 3
          </span>
          {timestamp && (
            <span className="text-[11px] font-mono text-slate-500">
              Updated: {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
      </div>

      {/* Explanation Box */}
      <div className="mt-4 p-4 rounded-lg bg-[#080c14] border-l-4 border-l-blue-500 border-y border-r border-[#1e293b]">
        {explanation ? (
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-sans">
            {explanation}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 italic text-xs py-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Awaiting telemetry snapshot... Start simulation to stream live AI analysis.</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>Evaluates network state every 50 ticks (5 seconds)</span>
        <span className="text-blue-400 font-mono">Multi-Objective Optimization (0.7 QoS + 0.3 Util)</span>
      </div>
    </div>
  );
}
