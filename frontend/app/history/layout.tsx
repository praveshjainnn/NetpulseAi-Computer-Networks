import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulation History - NetPulse AI",
  description: "View and analyze past simulation runs. Export data and compare performance metrics.",
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
