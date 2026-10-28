import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - NetPulse AI",
  description: "Real-time 5G network simulation dashboard. Watch AI optimize bandwidth allocation in real-time.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
