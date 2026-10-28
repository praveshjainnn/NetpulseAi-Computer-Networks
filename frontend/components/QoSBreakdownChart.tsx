"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface QoSBreakdownData {
  userType: string;
  baseline: number;
  ai: number;
  rl?: number;
}

interface QoSBreakdownChartProps {
  data: QoSBreakdownData[];
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
          {label}
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
            {entry.name}: {entry.value.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function QoSBreakdownChart({ data }: QoSBreakdownChartProps) {
  const hasRL = data.some(d => d.rl !== undefined);
  
  return (
    <div className="bg-[#0a0a0a] backdrop-blur-sm rounded-xl border border-[#1a1a1a] p-6">
      <h3 className="text-lg font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
        <span>🎯</span>
        <span>QoS Score by User Type</span>
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} style={{ backgroundColor: 'transparent' }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis
            dataKey="userType"
            stroke="#64748b"
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            label={{ value: "QoS Score", angle: -90, position: "insideLeft", fill: "#64748b" }}
            stroke="#64748b"
            tick={{ fill: "#64748b" }}
            domain={[0, 100]}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{
              zIndex: 9999,
            }}
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
          />
          <Legend wrapperStyle={{ color: "#f1f5f9" }} />
          <Bar
            dataKey="baseline"
            fill="#3b82f6"
            name="Baseline"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="ai"
            fill="#9333ea"
            name="AI"
            radius={[4, 4, 0, 0]}
          />
          {hasRL && (
            <Bar
              dataKey="rl"
              fill="#22c55e"
              name="RL"
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
