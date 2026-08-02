import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrchestraX",
  description: "Live control surface for a fault-tolerant distributed job queue.",
};

// Pin the browser chrome to the canvas so it blends with the ambient backdrop.
export const viewport: Viewport = {
  themeColor: "#f4f6fc",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Ambient layers sit beneath every panel and never take pointer events. */}
        <div className="aurora" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
        </div>
        <div className="vignette" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
