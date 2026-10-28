"use client";

import Link from "next/link";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080c14] text-[#f8fafc] flex flex-col justify-between selection:bg-blue-600/30 selection:text-blue-200">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#080c14]/90 backdrop-blur-md border-b border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 border border-blue-400/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13L7 9L11 13L15 6L18 10L21 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="6" r="2" fill="white" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">QoSSync <span className="text-blue-400">RL</span></span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              API Docs
            </a>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow-md shadow-blue-500/20"
            >
              Launch Studio &rarr;
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Reinforcement Learning Bandwidth Framework
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Intelligent Bandwidth Allocation <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500 bg-clip-text text-transparent">
              Using Reinforcement Learning
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Traditional equal-split policies cannot satisfy diverse application demands. QoSSync RL dynamically optimizes Quality of Service while <strong className="text-blue-300 font-semibold">maximizing total network utilization</strong> via demand-capped water-fill distribution.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <span>Open RL Control Studio</span>
              <span>&rarr;</span>
            </Link>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-[#0d1527] hover:bg-[#111c33] border border-[#1e293b] text-slate-300 hover:text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Swagger API Specs</span>
            </a>
          </div>

          {/* Core Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-10 text-left">
            <div className="p-5 rounded-xl bg-[#0d1527] border border-[#1e293b] shadow-md">
              <div className="text-blue-400 text-xl mb-2">🧠</div>
              <h3 className="text-sm font-bold text-white mb-1">Multi-Armed Bandit</h3>
              <p className="text-xs text-slate-400">
                Discrete action space exploring priority weight arms with &epsilon;-greedy Q-learning, converging smoothly over continuous traffic demand snapshots.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0d1527] border border-[#1e293b] shadow-md">
              <div className="text-indigo-400 text-xl mb-2">🌊</div>
              <h3 className="text-sm font-bold text-white mb-1">Waterfill Demand-Cap</h3>
              <p className="text-xs text-slate-400">
                Never over-allocates beyond real traffic demand. Leftover capacity is iteratively redistributed to deficit streams, boosting network utilization by up to +35%.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0d1527] border border-[#1e293b] shadow-md">
              <div className="text-emerald-400 text-xl mb-2">🛡️</div>
              <h3 className="text-sm font-bold text-white mb-1">No-Starvation Guard</h3>
              <p className="text-xs text-slate-400">
                Guaranteed minimum allocation efficiency (&gt;36.5%) across Video, Gaming, IoT, and VoIP flows even under 49% congestion stress.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
