import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Distributed Task Orchestrator",
  description: "Live dashboard for a fault-tolerant distributed job queue.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
