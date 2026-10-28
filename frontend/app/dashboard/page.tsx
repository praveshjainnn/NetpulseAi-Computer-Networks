"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import ControlPanel from "@/components/ControlPanel";
import ConfigurationPanel from "@/components/ConfigurationPanel";
import QoSImprovementBanner from "@/components/QoSImprovementBanner";
import ComparisonPanels from "@/components/ComparisonPanels";
import ChartsSection from "@/components/ChartsSection";
import StatisticsTable from "@/components/StatisticsTable";
import ExplainabilityPanel from "@/components/ExplainabilityPanel";
import RLAgentVisualizer from "@/components/RLAgentVisualizer";
import StarvationGuardCard from "@/components/StarvationGuardCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Footer from "@/components/Footer";
import { useWebSocket, NetworkState } from "@/hooks/useWebSocket";
import * as api from "@/lib/api";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<NetworkState[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [config, setConfig] = useState<api.SimulationConfig>({
    total_bandwidth: 60.0,
    base_latency: 10.0,
    congestion_factor: 1.5,
    packet_loss_rate: 2.0,
    random_seed: 42,
  });
  const historyRef = useRef<NetworkState[]>([]);

  // Check stored session on mount
  useEffect(() => {
    const storedSessionId = api.getSessionId();
    if (storedSessionId) {
      api.getStatus().then((response) => {
        if (response.success && response.data?.session_id === storedSessionId) {
          setSessionId(storedSessionId);
          setIsRunning(response.data?.running || false);
        } else {
          api.clearSessionId();
          setSessionId(null);
        }
      });
    }
  }, []);

  // WebSocket hook
  const { networkState, connectionStatus, error } = useWebSocket(sessionId || undefined);

  // Maintain rolling window of 100 ticks
  useEffect(() => {
    if (networkState) {
      const newHistory = [...historyRef.current, networkState];
      if (newHistory.length > 100) {
        newHistory.shift();
      }
      historyRef.current = newHistory;
      setHistory(newHistory);
    }
  }, [networkState]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      const currentSessionId = api.getSessionId();
      if (currentSessionId) {
        api.deleteSession();
      }
    };
  }, []);

  // Allocations data extraction
  const baselineAllocations = networkState?.baseline_result.decision.allocations || {
    video_streaming: 15.0,
    online_gaming: 15.0,
    iot_devices: 15.0,
    voip_messaging: 15.0,
  };

  const aiAllocations = networkState?.ai_result.decision.allocations || {
    video_streaming: 25.0,
    online_gaming: 15.0,
    iot_devices: 5.0,
    voip_messaging: 15.0,
  };

  const rlAllocations = networkState?.rl_result?.decision.allocations;

  const baselineQoS = networkState?.baseline_result.qos_score || 0;
  const aiQoS = networkState?.ai_result.qos_score || 0;
  const rlQoS = networkState?.rl_result?.qos_score;

  const baselineUtilization = networkState?.baseline_result.utilization;
  const aiUtilization = networkState?.ai_result.utilization;
  const rlUtilization = networkState?.rl_result?.utilization;

  const currentTick = networkState?.tick || 0;

  // Poll RL statistics every 5 ticks
  const [rlStats, setRlStats] = useState<any>(null);
  useEffect(() => {
    if (isRunning && currentTick > 0 && sessionId) {
      const fetchRLStats = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${apiUrl}/api/simulation/rl-stats`, {
            headers: { "X-Session-ID": sessionId },
          });
          if (res.ok) {
            const data = await res.json();
            setRlStats(data);
          }
        } catch {
          // ignore error
        }
      };

      if (currentTick % 5 === 0) {
        fetchRLStats();
      }
    }
  }, [isRunning, currentTick, sessionId]);

  const handleStart = async () => {
    setLoading(true);
    setApiError(null);

    const response = await api.startSimulation(config);
    if (response.success) {
      setIsRunning(true);
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
    } else {
      setApiError(response.error || "Failed to start simulation");
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    setApiError(null);

    const response = await api.stopSimulation();
    if (response.success) {
      setIsRunning(false);
      setHistory([]);
      historyRef.current = [];
    } else {
      setApiError(response.error || "Failed to stop simulation");
    }
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    setApiError(null);

    if (isRunning && sessionId) {
      await api.stopSimulation();
    }
    if (sessionId) {
      await api.deleteSession();
    }

    setIsRunning(false);
    setHistory([]);
    historyRef.current = [];
    setSessionId(null);
    setRlStats(null);

    setConfig({
      total_bandwidth: 60.0,
      base_latency: 10.0,
      congestion_factor: 1.5,
      packet_loss_rate: 2.0,
      random_seed: 42,
    });

    setLoading(false);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#080c14] text-[#f8fafc]">
        {/* Navigation Bar with Studio Tabs */}
        <Navbar
          connectionStatus={connectionStatus}
          isRunning={isRunning}
          tickCount={currentTick}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="flex-1 max-w-[2560px] w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Executive Sub-Header / Problem Alignment Banner */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-xl bg-[#0d1527] border border-[#1e293b]">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Target Problem Statement:
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  Reinforcement learning-based bandwidth allocation optimizing Quality of Service while <strong className="text-blue-300">maximizing network utilization</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-[#080c14] text-slate-400 border border-[#1e293b]">
                Cap: {config.total_bandwidth} Mbps
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                Reward: 0.7 QoS + 0.3 Util
              </span>
            </div>
          </div>

          {/* Interactive Environment & Control Deck */}
          <div className="space-y-3">
            <ConfigurationPanel
              currentConfig={config}
              onConfigChange={setConfig}
              disabled={isRunning || loading}
            />

            <ControlPanel
              isRunning={isRunning || loading}
              onStart={handleStart}
              onStop={handleStop}
              onReset={handleReset}
            />
          </div>

          {/* API / Socket Alerts */}
          {apiError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-300">
              {apiError}
            </div>
          )}

          {error && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300">
              WebSocket Notice: {error}
            </div>
          )}

          {/* ═══════════ TAB 1: OVERVIEW DASHBOARD ═══════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              {/* QoS Improvement Banner */}
              <QoSImprovementBanner
                baselineQoS={baselineQoS}
                aiQoS={aiQoS}
                rlQoS={rlQoS}
                baselineUtilization={baselineUtilization}
                aiUtilization={aiUtilization}
                rlUtilization={rlUtilization}
              />

              {/* Tri-Engine Strategy Comparison Cards */}
              <ComparisonPanels
                baselineAllocations={baselineAllocations}
                aiAllocations={aiAllocations}
                rlAllocations={rlAllocations}
                baselineQoS={baselineQoS}
                aiQoS={aiQoS}
                rlQoS={rlQoS}
                baselineUtilization={baselineUtilization}
                aiUtilization={aiUtilization}
                rlUtilization={rlUtilization}
                tick={currentTick}
                explorationRate={rlStats?.exploration_rate}
              />

              {/* Real-time Telemetry Curves (QoS, Utilization, Allocation, Throughput) */}
              <ChartsSection history={history} />

              {/* AI Explainability & Strategic Reasoning Feed */}
              <ExplainabilityPanel
                explanation={networkState?.explanation}
                timestamp={networkState?.explanation_timestamp}
              />
            </div>
          )}

          {/* ═══════════ TAB 2: DEEP RL LEARNING STUDIO ═══════════ */}
          {activeTab === "rl_studio" && (
            <div className="space-y-6 animate-fadeIn">
              <RLAgentVisualizer
                rlAllocations={rlAllocations}
                demands={networkState?.demands}
                explorationRate={rlStats?.exploration_rate ?? 0.15}
                rlQoS={rlQoS}
                baselineQoS={baselineQoS}
                rlUtilization={rlUtilization}
                baselineUtilization={baselineUtilization}
                tick={currentTick}
              />

              {/* Natural Language AI / Rule-Based Explainability */}
              <ExplainabilityPanel
                explanation={networkState?.explanation}
                timestamp={networkState?.explanation_timestamp}
              />
            </div>
          )}

          {/* ═══════════ TAB 3: ANALYTICS & STRESS TESTING ═══════════ */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Starvation Protection Card */}
              <StarvationGuardCard tick={currentTick} />

              {/* Detailed 50-Tick Statistics Table with Utilization Row */}
              <StatisticsTable history={history} />
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
}
