import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works - NetPulse AI",
  description: "Learn about the architecture, algorithms, and real-time simulation engine powering intelligent 5G network optimization.",
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
