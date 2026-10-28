"use client";

import { useMemo } from "react";
import { NetworkState } from "@/hooks/useWebSocket";
import {
  isLatencyBetter,
  isThroughputBetter,
  isPacketLossBetter,
} from "@/lib/statisticsHighlighting";

interface StatisticsTableProps {
  history: NetworkState[];
}

interface UserTypeStats {
  avgLatency: number;
  avgThroughput: number;
  avgPacketLoss: number;
  avgAllocationEfficiency: number;
  avgUtilization?: number;  // Change 1: rolling average utilization
}

interface AllocatorStats {
  video_streaming: UserTypeStats;
  online_gaming: UserTypeStats;
  iot_devices: UserTypeStats;
  voip_messaging: UserTypeStats;
}

export default function StatisticsTable({ history }: StatisticsTableProps) {
  // Calculate rolling averages over last 50 ticks
  const { baselineStats, aiStats, rlStats, hasRL } = useMemo(() => {
    if (history.length === 0) {
      const emptyStats: UserTypeStats = {
        avgLatency: 0,
        avgThroughput: 0,
        avgPacketLoss: 0,
        avgAllocationEfficiency: 0,
      };
      return {
        baselineStats: {
          video_streaming: emptyStats,
          online_gaming: emptyStats,
          iot_devices: emptyStats,
          voip_messaging: emptyStats,
        },
        aiStats: {
          video_streaming: emptyStats,
          online_gaming: emptyStats,
          iot_devices: emptyStats,
          voip_messaging: emptyStats,
        },
        rlStats: {
          video_streaming: emptyStats,
          online_gaming: emptyStats,
          iot_devices: emptyStats,
          voip_messaging: emptyStats,
        },
        hasRL: false,
      };
    }

    // Take last 50 ticks or all available if less than 50
    const recentHistory = history.slice(-50);
    const count = recentHistory.length;
    const hasRL = recentHistory.some(state => state.rl_result !== undefined);

    const calculateStats = (
      userType: keyof typeof recentHistory[0]["baseline_result"]["metrics"],
      allocator: "baseline_result" | "ai_result" | "rl_result"
    ): UserTypeStats => {
      const sum = recentHistory.reduce(
        (acc, state) => {
          const result = state[allocator];
          if (!result) return acc;
          const metrics = result.metrics[userType];
          return {
            latency: acc.latency + metrics.latency,
            throughput: acc.throughput + metrics.throughput,
            packetLoss: acc.packetLoss + metrics.packet_loss,
            allocationEfficiency: acc.allocationEfficiency + metrics.allocation_efficiency,
          };
        },
        { latency: 0, throughput: 0, packetLoss: 0, allocationEfficiency: 0 }
      );

      return {
        avgLatency: sum.latency / count,
        avgThroughput: sum.throughput / count,
        avgPacketLoss: sum.packetLoss / count,
        avgAllocationEfficiency: sum.allocationEfficiency / count,
        // Change 1: avg utilization from AllocationResult (not per-user-type)
        avgUtilization: undefined,
      };
    };

    // Separately compute per-allocator utilization (result-level, not per-user-type)
    const calculateUtilizationAvg = (
      allocator: "baseline_result" | "ai_result" | "rl_result"
    ): number => {
      const vals = recentHistory
        .map((state) => state[allocator]?.utilization ?? null)
        .filter((v): v is number => v !== null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const userTypes: Array<
      keyof typeof recentHistory[0]["baseline_result"]["metrics"]
    > = ["video_streaming", "online_gaming", "iot_devices", "voip_messaging"];

    const baselineStats: AllocatorStats = {} as AllocatorStats;
    const aiStats: AllocatorStats = {} as AllocatorStats;
    const rlStats: AllocatorStats = {} as AllocatorStats;

    userTypes.forEach((userType) => {
      baselineStats[userType] = calculateStats(userType, "baseline_result");
      aiStats[userType] = calculateStats(userType, "ai_result");
      if (hasRL) {
        rlStats[userType] = calculateStats(userType, "rl_result");
      }
    });

    // Attach rolling utilization averages to the first user type row (video_streaming)
    // We show it as a summary row not tied to any specific user type
    const blUtil = calculateUtilizationAvg("baseline_result");
    const aiUtil = calculateUtilizationAvg("ai_result");
    const rlUtil = hasRL ? calculateUtilizationAvg("rl_result") : 0;

    baselineStats["video_streaming"].avgUtilization = blUtil;
    aiStats["video_streaming"].avgUtilization = aiUtil;
    if (hasRL) rlStats["video_streaming"].avgUtilization = rlUtil;

    return { baselineStats, aiStats, rlStats, hasRL };
  }, [history]);

  const userTypeLabels = {
    video_streaming: "Video Streaming",
    online_gaming: "Online Gaming",
    iot_devices: "IoT Devices",
    voip_messaging: "VoIP/Messaging",
  };

  return (
    <div className="bg-[#0a0a0a] backdrop-blur-sm rounded-xl border border-[#06b6d4]/30 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#f1f5f9]">
          Statistics Table
        </h2>
        <p className="text-sm text-[#64748b]">Rolling Average — Last 50 Ticks</p>
      </div>
      
      {history.length === 0 ? (
        <p className="text-[#64748b] text-center py-4">
          No data available. Start the simulation to see statistics.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0a0a0a]">
              <tr className="border-b border-[#1a1a1a]">
                <th className="text-left py-3 px-4 font-semibold text-[#f1f5f9]">
                  User Type
                </th>
                <th className="text-left py-3 px-4 font-semibold text-[#f1f5f9]">
                  Metric
                </th>
                <th className="text-center py-3 px-4 font-semibold text-blue-400">
                  Baseline
                </th>
                <th className="text-center py-3 px-4 font-semibold text-cyan-400">
                  AI
                </th>
                {hasRL && (
                  <th className="text-center py-3 px-4 font-semibold text-green-400">
                    RL
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(
                Object.keys(userTypeLabels) as Array<keyof typeof userTypeLabels>
              ).map((userType) => (
                <UserTypeRows
                  key={userType}
                  userType={userType}
                  label={userTypeLabels[userType]}
                  baselineStats={baselineStats[userType]}
                  aiStats={aiStats[userType]}
                  rlStats={hasRL ? rlStats[userType] : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface UserTypeRowsProps {
  userType: string;
  label: string;
  baselineStats: UserTypeStats;
  aiStats: UserTypeStats;
  rlStats?: UserTypeStats;
}

function UserTypeRows({
  userType,
  label,
  baselineStats,
  aiStats,
  rlStats,
}: UserTypeRowsProps) {
  // Determine if AI outperforms baseline for each metric
  const latencyBetter = isLatencyBetter(baselineStats.avgLatency, aiStats.avgLatency);
  const throughputBetter = isThroughputBetter(baselineStats.avgThroughput, aiStats.avgThroughput);
  const packetLossBetter = isPacketLossBetter(baselineStats.avgPacketLoss, aiStats.avgPacketLoss);
  const efficiencyBetter = aiStats.avgAllocationEfficiency > baselineStats.avgAllocationEfficiency;
  
  // Determine if RL outperforms both baseline and AI
  const rlLatencyBest = rlStats && isLatencyBetter(baselineStats.avgLatency, rlStats.avgLatency) && isLatencyBetter(aiStats.avgLatency, rlStats.avgLatency);
  const rlThroughputBest = rlStats && isThroughputBetter(baselineStats.avgThroughput, rlStats.avgThroughput) && isThroughputBetter(aiStats.avgThroughput, rlStats.avgThroughput);
  const rlPacketLossBest = rlStats && isPacketLossBetter(baselineStats.avgPacketLoss, rlStats.avgPacketLoss) && isPacketLossBetter(aiStats.avgPacketLoss, rlStats.avgPacketLoss);
  const rlEfficiencyBest = rlStats && rlStats.avgAllocationEfficiency > baselineStats.avgAllocationEfficiency && rlStats.avgAllocationEfficiency > aiStats.avgAllocationEfficiency;

  // User type color badges
  const userTypeColors: Record<string, string> = {
    video_streaming: "bg-[#06b6d4]/20 text-[#06b6d4] border-[#06b6d4]/30",
    online_gaming: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30",
    iot_devices: "bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30",
    voip_messaging: "bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30",
  };

  return (
    <>
      {/* Latency Row */}
      <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50">
        <td className="py-2 px-4">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${userTypeColors[userType]}`}>
            {label}
          </span>
        </td>
        <td className="py-2 px-4 text-[#64748b]">Latency (ms)</td>
        <td className="py-2 px-4 text-center text-[#f1f5f9]">
          {baselineStats.avgLatency.toFixed(2)}
        </td>
        <td
          className={`py-2 px-4 text-center font-medium ${
            latencyBetter ? "bg-[#10b981]/10 text-[#10b981]" : "text-[#f1f5f9]"
          }`}
        >
          {latencyBetter && <span className="mr-1">↓</span>}
          {aiStats.avgLatency.toFixed(2)}
        </td>
        {rlStats && (
          <td
            className={`py-2 px-4 text-center font-medium ${
              rlLatencyBest ? "bg-[#22c55e]/20 text-[#22c55e]" : "text-[#f1f5f9]"
            }`}
          >
            {rlLatencyBest && <span className="mr-1">↓</span>}
            {rlStats.avgLatency.toFixed(2)}
          </td>
        )}
      </tr>

      {/* Throughput Row */}
      <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50">
        <td className="py-2 px-4"></td>
        <td className="py-2 px-4 text-[#64748b]">Throughput (Mbps)</td>
        <td className="py-2 px-4 text-center text-[#f1f5f9]">
          {baselineStats.avgThroughput.toFixed(2)}
        </td>
        <td
          className={`py-2 px-4 text-center font-medium ${
            throughputBetter ? "bg-[#10b981]/10 text-[#10b981]" : "text-[#f1f5f9]"
          }`}
        >
          {throughputBetter && <span className="mr-1">↑</span>}
          {aiStats.avgThroughput.toFixed(2)}
        </td>
        {rlStats && (
          <td
            className={`py-2 px-4 text-center font-medium ${
              rlThroughputBest ? "bg-[#22c55e]/20 text-[#22c55e]" : "text-[#f1f5f9]"
            }`}
          >
            {rlThroughputBest && <span className="mr-1">↑</span>}
            {rlStats.avgThroughput.toFixed(2)}
          </td>
        )}
      </tr>

      {/* Packet Loss Row */}
      <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50">
        <td className="py-2 px-4"></td>
        <td className="py-2 px-4 text-[#64748b]">Packet Loss (%)</td>
        <td className="py-2 px-4 text-center text-[#f1f5f9]">
          {baselineStats.avgPacketLoss.toFixed(2)}
        </td>
        <td
          className={`py-2 px-4 text-center font-medium ${
            packetLossBetter ? "bg-[#10b981]/10 text-[#10b981]" : "text-[#f1f5f9]"
          }`}
        >
          {packetLossBetter && <span className="mr-1">↓</span>}
          {aiStats.avgPacketLoss.toFixed(2)}
        </td>
        {rlStats && (
          <td
            className={`py-2 px-4 text-center font-medium ${
              rlPacketLossBest ? "bg-[#22c55e]/20 text-[#22c55e]" : "text-[#f1f5f9]"
            }`}
          >
            {rlPacketLossBest && <span className="mr-1">↓</span>}
            {rlStats.avgPacketLoss.toFixed(2)}
          </td>
        )}
      </tr>

      {/* Allocation Efficiency Row */}
      <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50">
        <td className="py-2 px-4"></td>
        <td className="py-2 px-4 text-[#64748b]">Allocation Efficiency</td>
        <td className="py-2 px-4 text-center text-[#f1f5f9]">
          {baselineStats.avgAllocationEfficiency.toFixed(2)}
        </td>
        <td
          className={`py-2 px-4 text-center font-medium ${
            efficiencyBetter ? "bg-[#10b981]/10 text-[#10b981]" : "text-[#f1f5f9]"
          }`}
        >
          {efficiencyBetter && <span className="mr-1">↑</span>}
          {aiStats.avgAllocationEfficiency.toFixed(2)}
        </td>
        {rlStats && (
          <td
            className={`py-2 px-4 text-center font-medium ${
              rlEfficiencyBest ? "bg-[#22c55e]/20 text-[#22c55e]" : "text-[#f1f5f9]"
            }`}
          >
            {rlEfficiencyBest && <span className="mr-1">↑</span>}
            {rlStats.avgAllocationEfficiency.toFixed(2)}
          </td>
        )}
      </tr>

      {/* Change 1: Utilization Row (result-level, shown on video_streaming group) */}
      {baselineStats.avgUtilization !== undefined && (
        <tr className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50 bg-[#06b6d4]/5">
          <td className="py-2 px-4"></td>
          <td className="py-2 px-4 text-[#06b6d4] font-medium">Utilization (%)</td>
          <td className="py-2 px-4 text-center text-[#f1f5f9]">
            {baselineStats.avgUtilization.toFixed(1)}%
          </td>
          <td
            className={`py-2 px-4 text-center font-medium ${
              (aiStats.avgUtilization ?? 0) > (baselineStats.avgUtilization ?? 0)
                ? "bg-[#10b981]/10 text-[#10b981]"
                : "text-[#f1f5f9]"
            }`}
          >
            {(aiStats.avgUtilization ?? 0) > (baselineStats.avgUtilization ?? 0) && (
              <span className="mr-1">↑</span>
            )}
            {(aiStats.avgUtilization ?? 0).toFixed(1)}%
          </td>
          {rlStats && (
            <td
              className={`py-2 px-4 text-center font-medium ${
                (rlStats.avgUtilization ?? 0) > (baselineStats.avgUtilization ?? 0) &&
                (rlStats.avgUtilization ?? 0) > (aiStats.avgUtilization ?? 0)
                  ? "bg-[#22c55e]/20 text-[#22c55e]"
                  : "text-[#f1f5f9]"
              }`}
            >
              {(rlStats.avgUtilization ?? 0) > (baselineStats.avgUtilization ?? 0) &&
                (rlStats.avgUtilization ?? 0) > (aiStats.avgUtilization ?? 0) && (
                  <span className="mr-1">↑</span>
                )}
              {(rlStats.avgUtilization ?? 0).toFixed(1)}%
            </td>
          )}
        </tr>
      )}
    </>
  );
}
