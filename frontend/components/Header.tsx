"use client";

interface HeaderProps {
  connectionStatus: "connected" | "disconnected";
}

export default function Header({ connectionStatus }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          AI-Based 5G Digital Twin Network Simulator
        </h1>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {connectionStatus === "connected" ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </header>
  );
}
