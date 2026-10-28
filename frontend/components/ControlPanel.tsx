"use client";

interface ControlPanelProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export default function ControlPanel({
  isRunning,
  onStart,
  onStop,
  onReset,
}: ControlPanelProps) {
  return (
    <div className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Buttons Action Group */}
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <button
            onClick={onStart}
            disabled={isRunning}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/30 text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 disabled:shadow-none disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Start Simulation</span>
          </button>

          <button
            onClick={onStop}
            disabled={!isRunning}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-rose-600/90 hover:bg-rose-500 disabled:bg-rose-950/20 text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-all disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Stop Engine</span>
          </button>

          <button
            onClick={onReset}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-[#080c14] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-white rounded-lg font-medium text-xs tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <span>&#8635;</span>
            <span>Reset State</span>
          </button>
        </div>

        {/* Engine Performance Tag */}
        <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#1e293b]">
          <span className="text-slate-400">Simulation Tick Interval:</span>
          <span className="font-mono text-blue-400 font-bold px-2 py-1 rounded bg-[#080c14] border border-[#1e293b]">
            100 ms / tick (10 Hz)
          </span>
        </div>
      </div>
    </div>
  );
}
