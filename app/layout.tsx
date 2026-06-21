import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PraxisAI - Expert Brains for AI Agents",
  description: "Turn a generalist AI into a verified specialist in seconds."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
