"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

interface SimulationRun {
  run_id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_ticks: number;
  avg_baseline_qos: number;
  avg_ai_qos: number;
  qos_improvement: number;
  config_summary: {
    total_bandwidth: number;
    base_latency: number;
    congestion_factor: number;
    packet_loss_rate: number;
  };
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const fetchHistory = async (pageNum: number) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/history?page=${pageNum}&limit=10`);

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setRuns(data.runs);
      setTotalPages(data.total_pages);
      setHasNext(data.has_next);
      setHasPrev(data.has_prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const handleDelete = async (runId: string) => {
    if (!confirm("Are you sure you want to delete this simulation run?")) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/history/${runId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the list
        fetchHistory(page);
      } else {
        alert("Failed to delete run");
      }
    } catch (err) {
      alert("Error deleting run");
    }
  };

  const handleExport = (runId: string, format: "csv" | "json") => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.open(`${apiUrl}/api/history/${runId}/export?format=${format}`, "_blank");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f1f5f9]">
      {/* Simple Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="historyLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#06b6d4',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#14b8a6',stopOpacity:1}} />
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="8" fill="url(#historyLogoGradient)"/>
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
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-[#f1f5f9] hover:text-[#06b6d4] transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-2 bg-gradient-to-r from-[#06b6d4] to-[#14b8a6] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Simulation History</h1>
          <p className="text-[#64748b]">View and analyze past simulation runs</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06b6d4]"></div>
            <p className="mt-4 text-[#64748b]">Loading history...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && runs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#64748b] text-lg mb-4">No simulation history found</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gradient-to-r from-[#06b6d4] to-[#14b8a6] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Start Your First Simulation
            </Link>
          </div>
        )}

        {!loading && !error && runs.length > 0 && (
          <>
            <div className="space-y-4">
              {runs.map((run) => (
                <div
                  key={run.run_id}
                  className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 sm:p-6 hover:border-[#06b6d4] transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                    <div className="w-full sm:w-auto">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-semibold">
                          Run #{run.run_id.slice(0, 8)}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            run.status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <p className="text-sm text-[#64748b]">
                        {formatDate(run.start_time)} → {formatDate(run.end_time)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExport(run.run_id, "csv")}
                        className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#2a2a3a] rounded text-sm transition-colors"
                        title="Export as CSV"
                      >
                        📊 CSV
                      </button>
                      <button
                        onClick={() => handleExport(run.run_id, "json")}
                        className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#2a2a3a] rounded text-sm transition-colors"
                        title="Export as JSON"
                      >
                        📄 JSON
                      </button>
                      <button
                        onClick={() => handleDelete(run.run_id)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-[#64748b] mb-1">Total Ticks</p>
                      <p className="text-xl font-semibold">{run.total_ticks}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748b] mb-1">Baseline QoS</p>
                      <p className="text-xl font-semibold">{run.avg_baseline_qos.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748b] mb-1">AI QoS</p>
                      <p className="text-xl font-semibold text-[#06b6d4]">
                        {run.avg_ai_qos.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748b] mb-1">Improvement</p>
                      <p className="text-xl font-semibold text-green-400">
                        +{run.qos_improvement.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#1a1a1a] pt-4">
                    <p className="text-xs text-[#64748b] mb-2">Configuration</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-[#64748b]">Bandwidth:</span>{" "}
                        <span className="text-[#f1f5f9]">
                          {run.config_summary.total_bandwidth} Mbps
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Latency:</span>{" "}
                        <span className="text-[#f1f5f9]">
                          {run.config_summary.base_latency} ms
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Congestion:</span>{" "}
                        <span className="text-[#f1f5f9]">
                          {run.config_summary.congestion_factor}x
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Packet Loss:</span>{" "}
                        <span className="text-[#f1f5f9]">
                          {run.config_summary.packet_loss_rate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!hasPrev}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  hasPrev
                    ? "bg-[#1a1a1a] hover:bg-[#2a2a3a] text-[#f1f5f9]"
                    : "bg-[#1a1a1a]/50 text-[#64748b] cursor-not-allowed"
                }`}
              >
                ← Previous
              </button>

              <span className="text-[#64748b]">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(page + 1)}
                disabled={!hasNext}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  hasNext
                    ? "bg-[#1a1a1a] hover:bg-[#2a2a3a] text-[#f1f5f9]"
                    : "bg-[#1a1a1a]/50 text-[#64748b] cursor-not-allowed"
                }`}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
