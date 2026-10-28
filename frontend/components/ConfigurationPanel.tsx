"use client";

import { useState, useEffect } from "react";
import { SimulationConfig } from "@/lib/api";

interface ConfigurationPanelProps {
  currentConfig: SimulationConfig | null;
  onConfigChange: (config: SimulationConfig) => void;
  disabled?: boolean;
}

interface ValidationErrors {
  total_bandwidth?: string;
  base_latency?: string;
  congestion_factor?: string;
  packet_loss_rate?: string;
}

export default function ConfigurationPanel({
  currentConfig,
  onConfigChange,
  disabled = false,
}: ConfigurationPanelProps) {
  const [config, setConfig] = useState<SimulationConfig>({
    total_bandwidth: 60.0,
    base_latency: 10.0,
    congestion_factor: 1.5,
    packet_loss_rate: 2.0,
    random_seed: 42,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  const handleChange = (field: keyof SimulationConfig, value: number) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    onConfigChange(updated);
  };

  return (
    <div className="rounded-xl bg-[#0d1527] border border-[#1e293b] p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-sm">&#9881;</span>
          <h3 className="text-sm font-bold text-white tracking-wide">
            Network Environment &amp; Stress Parameters
          </h3>
          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
            (Total Cap: {config.total_bandwidth} Mbps &bull; Seed: {config.random_seed})
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          {isExpanded ? "Collapse Parameters ▴" : "Tune Parameters ▾"}
        </button>
      </div>

      {/* Expanded Parameter Inputs */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#1e293b] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Bandwidth */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Bandwidth Cap (Mbps)
            </label>
            <input
              type="number"
              min="10"
              max="500"
              step="5"
              value={config.total_bandwidth}
              disabled={disabled}
              onChange={(e) => handleChange("total_bandwidth", parseFloat(e.target.value) || 60)}
              className="w-full px-3 py-2 bg-[#080c14] border border-[#1e293b] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Default: 60 Mbps (49% stress)</span>
          </div>

          {/* Base Latency */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Base Latency (ms)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.base_latency}
              disabled={disabled}
              onChange={(e) => handleChange("base_latency", parseFloat(e.target.value) || 10)}
              className="w-full px-3 py-2 bg-[#080c14] border border-[#1e293b] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Typical: 10 ms</span>
          </div>

          {/* Congestion Factor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Congestion Factor
            </label>
            <input
              type="number"
              min="1.0"
              max="5.0"
              step="0.1"
              value={config.congestion_factor}
              disabled={disabled}
              onChange={(e) => handleChange("congestion_factor", parseFloat(e.target.value) || 1.5)}
              className="w-full px-3 py-2 bg-[#080c14] border border-[#1e293b] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Multiplier: 1.5&times;</span>
          </div>

          {/* Packet Loss */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Packet Loss Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={config.packet_loss_rate}
              disabled={disabled}
              onChange={(e) => handleChange("packet_loss_rate", parseFloat(e.target.value) || 2.0)}
              className="w-full px-3 py-2 bg-[#080c14] border border-[#1e293b] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Base: 2.0%</span>
          </div>

          {/* Random Seed */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Deterministic Seed
            </label>
            <input
              type="number"
              value={config.random_seed}
              disabled={disabled}
              onChange={(e) => handleChange("random_seed", parseInt(e.target.value) || 42)}
              className="w-full px-3 py-2 bg-[#080c14] border border-[#1e293b] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Seed = 42 for repeatable runs</span>
          </div>
        </div>
      )}
    </div>
  );
}
