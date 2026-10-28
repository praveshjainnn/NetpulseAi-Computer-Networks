import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "QoSSync RL — Intelligent Bandwidth Allocation Framework",
  description: "Reinforcement learning-based bandwidth allocation framework that optimizes Quality of Service while maximizing network utilization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#080c14] text-[#f8fafc] antialiased selection:bg-blue-600/30 selection:text-blue-200">
        {children}
      </body>
    </html>
  );
}
