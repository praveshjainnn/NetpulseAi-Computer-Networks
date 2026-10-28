"use client";

import Link from "next/link";
import Footer from "@/components/Footer";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#f1f5f9]">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="navLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#06b6d4',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#14b8a6',stopOpacity:1}} />
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="8" fill="url(#navLogoGradient)"/>
              <path d="M8 20 L12 20 L14 12 L16 28 L18 16 L20 24 L22 20 L32 20" 
                    stroke="white" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none"/>
              <circle cx="14" cy="12" r="1.5" fill="white" opacity="0.8"/>
              <circle cx="16" cy="28" r="1.5" fill="white" opacity="0.8"/>
              <circle cx="18" cy="16" r="1.5" fill="white" opacity="0.8"/>
              <circle cx="20" cy="24" r="1.5" fill="white" opacity="0.8"/>
            </svg>
            <span className="text-xl font-bold">NetPulse AI</span>
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-gradient-to-r from-[#06b6d4] to-[#14b8a6] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Launch Simulator
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#06b6d4] via-[#14b8a6] to-[#06b6d4] bg-clip-text text-transparent">
            How NetPulse AI Works
          </h1>
          <p className="text-xl text-[#64748b] max-w-2xl mx-auto">
            A deep dive into the architecture, algorithms, and real-time simulation engine powering intelligent 5G network optimization
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4">Project Overview</h2>
            <p className="text-[#64748b] leading-relaxed mb-4">
              NetPulse AI is a real-time 5G network bandwidth allocation simulator that demonstrates how AI can optimize network resources better than traditional methods. The system compares three allocation strategies simultaneously:
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-[#000000] border border-blue-500/30 rounded-lg p-4">
                <div className="text-blue-400 font-bold mb-2">Baseline</div>
                <div className="text-sm text-[#64748b]">Equal-split allocation (25 Mbps each)</div>
              </div>
              <div className="bg-[#000000] border border-cyan-500/30 rounded-lg p-4">
                <div className="text-cyan-400 font-bold mb-2">AI Weighted</div>
                <div className="text-sm text-[#64748b]">Priority-based smart allocation</div>
              </div>
              <div className="bg-[#000000] border border-green-500/30 rounded-lg p-4">
                <div className="text-green-400 font-bold mb-2">RL Multi-Armed Bandit</div>
                <div className="text-sm text-[#64748b]">Learns optimal strategy over time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">System Architecture</h2>
          
          <div className="space-y-6">
            {/* Backend */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6">
              <h3 className="text-2xl font-bold text-[#06b6d4] mb-4">Backend (Python/FastAPI)</h3>
              <ul className="space-y-3 text-[#64748b]">
                <li className="flex items-start gap-3">
                  <span className="text-[#06b6d4] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">Simulation Engine:</span> Executes network ticks every 100ms with precise timing control
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#06b6d4] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">Traffic Generators:</span> Creates realistic demand patterns for 4 user types (Video, Gaming, IoT, VoIP)
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#06b6d4] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">Allocators:</span> Three strategies run in parallel on same demand snapshot
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#06b6d4] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">Metrics Collector:</span> Calculates QoS scores using weighted formula (25-25-15-35)
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#06b6d4] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">WebSocket Server:</span> Broadcasts network state to all connected clients in real-time
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#06b6d4] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">SQLite Database:</span> Stores simulation runs, snapshots, and historical data
                  </div>
                </li>
              </ul>
            </div>

            {/* Frontend */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6">
              <h3 className="text-2xl font-bold text-[#14b8a6] mb-4">Frontend (Next.js/React)</h3>
              <ul className="space-y-3 text-[#64748b]">
                <li className="flex items-start gap-3">
                  <span className="text-[#14b8a6] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">WebSocket Client:</span> Maintains persistent connection for real-time updates
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#14b8a6] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">Dashboard:</span> Displays live comparison panels, charts, and statistics
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#14b8a6] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">Charts (Recharts):</span> Visualizes allocation, throughput, and QoS trends
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#14b8a6] mt-1">▸</span>
                  <div>
                    <span className="text-[#f1f5f9] font-medium">Statistics Table:</span> Shows rolling averages over last 50 ticks
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Simulation Flow */}
      <section className="py-12 px-6 bg-[#0a0a0a]/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Simulation Flow (Every 100ms)</h2>
          
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Traffic Generation",
                description: "Generate random but realistic bandwidth demands for all 4 user types based on their characteristics",
                color: "from-[#06b6d4] to-[#06b6d4]/50"
              },
              {
                step: "2",
                title: "Baseline Allocation",
                description: "Equal-split: Divide 100 Mbps equally (25 Mbps each) regardless of demand",
                color: "from-[#3b82f6] to-[#3b82f6]/50"
              },
              {
                step: "3",
                title: "AI Allocation",
                description: "Weighted priority: Allocate based on demand × priority × latency sensitivity",
                color: "from-[#14b8a6] to-[#14b8a6]/50"
              },
              {
                step: "4",
                title: "RL Allocation",
                description: "Multi-armed bandit: Explore strategies (first 100 ticks) then exploit learned optimal",
                color: "from-[#22c55e] to-[#22c55e]/50"
              },
              {
                step: "5",
                title: "Calculate Metrics",
                description: "For each allocation: compute latency, throughput, packet loss, and allocation efficiency",
                color: "from-[#06b6d4] to-[#06b6d4]/50"
              },
              {
                step: "6",
                title: "Calculate QoS Scores",
                description: "Aggregate score using formula: (throughput×25%) + (latency×25%) + (packet_retention×15%) + (efficiency×35%)",
                color: "from-[#f59e0b] to-[#f59e0b]/50"
              },
              {
                step: "7",
                title: "Broadcast State",
                description: "Send complete network state to all connected clients via WebSocket",
                color: "from-[#ec4899] to-[#ec4899]/50"
              },
            ].map((item) => (
              <div key={item.step} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`}></div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#06b6d4] to-[#14b8a6] rounded-lg flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-[#64748b]">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Types */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Four User Types</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: "🎥",
                name: "Video Streaming",
                demand: "5-25 Mbps",
                latency: "Medium (0.4-0.6)",
                examples: "Netflix, YouTube",
                color: "border-[#06b6d4]/30"
              },
              {
                icon: "🎮",
                name: "Online Gaming",
                demand: "1-5 Mbps",
                latency: "Very High (0.85-0.95)",
                examples: "PUBG, Call of Duty",
                color: "border-[#10b981]/30"
              },
              {
                icon: "📡",
                name: "IoT Devices",
                demand: "0.1-1 Mbps",
                latency: "Low (0.1-0.3)",
                examples: "Smart home, sensors",
                color: "border-[#f59e0b]/30"
              },
              {
                icon: "💬",
                name: "VoIP/Messaging",
                demand: "0.5-2 Mbps",
                latency: "High (0.7-0.85)",
                examples: "WhatsApp, Zoom",
                color: "border-[#14b8a6]/30"
              },
            ].map((user) => (
              <div key={user.name} className={`bg-[#0a0a0a] border ${user.color} rounded-xl p-6`}>
                <div className="text-4xl mb-3">{user.icon}</div>
                <h3 className="text-xl font-bold mb-3">{user.name}</h3>
                <div className="space-y-2 text-sm text-[#64748b]">
                  <div><span className="text-[#f1f5f9]">Demand:</span> {user.demand}</div>
                  <div><span className="text-[#f1f5f9]">Latency Sensitivity:</span> {user.latency}</div>
                  <div><span className="text-[#f1f5f9]">Examples:</span> {user.examples}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-12 px-6 bg-[#0a0a0a]/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Key Metrics Explained</h2>
          
          <div className="space-y-4">
            {[
              {
                name: "Allocation Efficiency",
                weight: "35%",
                description: "Most important metric! Measures how smartly bandwidth is allocated. Baseline wastes bandwidth (over-allocates IoT/VoIP), AI allocates optimally.",
                better: "Higher is better"
              },
              {
                name: "Throughput",
                weight: "25%",
                description: "Actual data transfer rate (Mbps). Capped by min(allocation, demand). Shows how much data users can actually send/receive.",
                better: "Higher is better"
              },
              {
                name: "Latency",
                weight: "25%",
                description: "Network delay in milliseconds. Critical for gaming and VoIP. Increases with congestion and under-allocation.",
                better: "Lower is better"
              },
              {
                name: "Packet Retention",
                weight: "15%",
                description: "Percentage of packets successfully delivered (100% - packet_loss). Affected by congestion and under-allocation.",
                better: "Higher is better"
              },
            ].map((metric) => (
              <div key={metric.name} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold">{metric.name}</h3>
                  <span className="px-3 py-1 bg-[#06b6d4]/20 text-[#06b6d4] text-sm rounded-full font-medium">
                    {metric.weight} weight
                  </span>
                </div>
                <p className="text-[#64748b] mb-2">{metric.description}</p>
                <div className="text-sm text-[#10b981]">{metric.better}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticks */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4">What is a Tick?</h2>
            <p className="text-[#64748b] leading-relaxed mb-6">
              A <span className="text-[#f1f5f9] font-medium">tick</span> is one simulation cycle (100 milliseconds). Think of it as the heartbeat of the network - every tick, new demands are generated, allocations are made, metrics are calculated, and results are broadcast to the dashboard.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#000000] border border-[#1a1a1a] rounded-lg p-4">
                <div className="text-2xl font-bold text-[#06b6d4] mb-2">10 ticks</div>
                <div className="text-sm text-[#64748b]">= 1 second</div>
              </div>
              <div className="bg-[#000000] border border-[#1a1a1a] rounded-lg p-4">
                <div className="text-2xl font-bold text-[#14b8a6] mb-2">100 ticks</div>
                <div className="text-sm text-[#64748b]">= 10 seconds</div>
              </div>
              <div className="bg-[#000000] border border-[#1a1a1a] rounded-lg p-4">
                <div className="text-2xl font-bold text-[#06b6d4] mb-2">1000 ticks</div>
                <div className="text-sm text-[#64748b]">= 100 seconds</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
