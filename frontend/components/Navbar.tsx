"use client";

import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  connectionStatus: "connected" | "disconnected";
  isRunning: boolean;
  tickCount: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function Navbar({
  connectionStatus,
  isRunning,
  tickCount,
  activeTab = "overview",
  onTabChange,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#080c14]/90 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-[2560px] w-full mx-auto px-4 sm:px-6 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13L7 9L11 13L15 6L18 10L21 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="6" r="2" fill="white" />
                <circle cx="7" cy="9" r="1.5" fill="white" opacity="0.8" />
              </svg>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-white">QoSSync <span className="text-blue-400 font-extrabold">RL</span></span>
                <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Bandwidth Optimization
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Reinforcement Learning QoS & Utilization Control Center
              </div>
            </div>
          </div>

          {/* Center Tabs Navigation (if callback provided) */}
          {onTabChange && (
            <div className="hidden lg:flex items-center p-1 rounded-lg bg-[#0d1527] border border-[#1e293b]">
              <button
                onClick={() => onTabChange("overview")}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "overview"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                📊 Overview Dashboard
              </button>
              <button
                onClick={() => onTabChange("rl_studio")}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "rl_studio"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🧠 Deep RL Studio
              </button>
              <button
                onClick={() => onTabChange("analytics")}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "analytics"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                📈 Analytics & Starvation Guard
              </button>
            </div>
          )}

          {/* Right Status Indicators & Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Live Engine Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1527] border border-[#1e293b]">
              <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              <span className="text-xs font-medium text-slate-300">
                {isRunning ? "ENGINE ACTIVE" : "ENGINE IDLE"}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e293b] text-blue-300">
                Tick #{tickCount}
              </span>
            </div>

            {/* WebSocket Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1e293b] text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === "connected" ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
              <span className="text-[11px] text-slate-400">
                {connectionStatus === "connected" ? "Stream Live" : "Offline"}
              </span>
            </div>

            {/* API Docs Link */}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <span>API Specs</span>
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        {onTabChange && (
          <div className="flex lg:hidden items-center justify-around mt-2 pt-2 border-t border-[#1e293b] text-xs">
            <button
              onClick={() => onTabChange("overview")}
              className={`px-3 py-1 rounded ${activeTab === "overview" ? "bg-blue-600 text-white font-semibold" : "text-slate-400"}`}
            >
              Overview
            </button>
            <button
              onClick={() => onTabChange("rl_studio")}
              className={`px-3 py-1 rounded ${activeTab === "rl_studio" ? "bg-blue-600 text-white font-semibold" : "text-slate-400"}`}
            >
              RL Studio
            </button>
            <button
              onClick={() => onTabChange("analytics")}
              className={`px-3 py-1 rounded ${activeTab === "analytics" ? "bg-blue-600 text-white font-semibold" : "text-slate-400"}`}
            >
              Analytics
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
