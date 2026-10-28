"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AllocationDataPoint {
  tick: number;
  baseline_video: number;
  baseline_gaming: number;
  baseline_iot: number;
  baseline_voip: number;
  ai_video: number;
  ai_gaming: number;
  ai_iot: number;
  ai_voip: number;
  rl_video?: number;
  rl_gaming?: number;
  rl_iot?: number;
  rl_voip?: number;
}

interface AllocationChartProps {
  data: AllocationDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: "8px",
          padding: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
          zIndex: 9999,
        }}
      >
        <p style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>
          Tick: {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={`item-${index}`}
            style={{
              color: entry.color,
              padding: "2px 0",
              fontSize: "13px",
              margin: 0,
            }}
          >
            {entry.name}: {entry.value?.toFixed(2)} Mbps
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AllocationChart({ data }: AllocationChartProps) {
  return (
    <div className="bg-[#0a0a0a] backdrop-blur-sm rounded-xl border border-[#1a1a1a] p-6">
      <h3 className="text-lg font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
        <span>📊</span>
        <span>Bandwidth Allocation Over Time</span>
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis
            dataKey="tick"
            label={{ value: "Tick", position: "insideBottom", offset: -5, fill: "#64748b" }}
            stroke="#64748b"
            tick={{ fill: "#64748b" }}
          />
          <YAxis
            label={{ value: "Allocation (Mbps)", angle: -90, position: "insideLeft", fill: "#64748b" }}
            stroke="#64748b"
            tick={{ fill: "#64748b" }}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{
              zIndex: 9999,
            }}
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
          />
          
          {/* Baseline lines (blue shades) */}
          <Line
            type="monotone"
            dataKey="baseline_video"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Baseline Video"
          />
          <Line
            type="monotone"
            dataKey="baseline_gaming"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            name="Baseline Gaming"
          />
          <Line
            type="monotone"
            dataKey="baseline_iot"
            stroke="#93c5fd"
            strokeWidth={2}
            dot={false}
            name="Baseline IoT"
          />
          <Line
            type="monotone"
            dataKey="baseline_voip"
            stroke="#bfdbfe"
            strokeWidth={2}
            dot={false}
            name="Baseline VoIP"
          />
          
          {/* AI lines (purple shades) */}
          <Line
            type="monotone"
            dataKey="ai_video"
            stroke="#9333ea"
            strokeWidth={2}
            dot={false}
            name="AI Video"
          />
          <Line
            type="monotone"
            dataKey="ai_gaming"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
            name="AI Gaming"
          />
          <Line
            type="monotone"
            dataKey="ai_iot"
            stroke="#c084fc"
            strokeWidth={2}
            dot={false}
            name="AI IoT"
          />
          <Line
            type="monotone"
            dataKey="ai_voip"
            stroke="#d8b4fe"
            strokeWidth={2}
            dot={false}
            name="AI VoIP"
          />
          
          {/* RL lines (green shades) */}
          {data.some(d => d.rl_video !== undefined) && (
            <>
              <Line
                type="monotone"
                dataKey="rl_video"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="RL Video"
              />
              <Line
                type="monotone"
                dataKey="rl_gaming"
                stroke="#4ade80"
                strokeWidth={2}
                dot={false}
                name="RL Gaming"
              />
              <Line
                type="monotone"
                dataKey="rl_iot"
                stroke="#86efac"
                strokeWidth={2}
                dot={false}
                name="RL IoT"
              />
              <Line
                type="monotone"
                dataKey="rl_voip"
                stroke="#bbf7d0"
                strokeWidth={2}
                dot={false}
                name="RL VoIP"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
