"use client";

import { useEffect, useState } from "react";

export default function Footer() {
  const [healthStatus, setHealthStatus] = useState<"healthy" | "degraded" | "unknown">("unknown");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setHealthStatus(data.status);
        } else {
          setHealthStatus("degraded");
        }
      } catch {
        setHealthStatus("degraded");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (healthStatus) {
      case "healthy":
        return "bg-emerald-400";
      case "degraded":
        return "bg-amber-400";
      default:
        return "bg-slate-500";
    }
  };

  const getStatusText = () => {
    switch (healthStatus) {
      case "healthy":
        return "Backend Online & Connected";
      case "degraded":
        return "Backend Degraded (In-Memory / No Cloud DB)";
      default:
        return "Checking Health...";
    }
  };

  return (
    <footer className="border-t border-[#1e293b] py-6 px-6 bg-[#080c14]/90 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-semibold text-slate-200">QoSSync RL</span> &mdash; AI-Based Intelligent Bandwidth Allocation Using Reinforcement Learning
          <div className="text-[11px] text-slate-500 mt-0.5">
            Optimizes Quality of Service while maximizing network utilization &bull; GPL-3.0 License
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span>{getStatusText()}</span>
          </a>

          <span className="text-slate-600">|</span>

          <span className="text-slate-300 font-medium">
            Built by <strong className="text-blue-400">Pravesh Jain</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}
