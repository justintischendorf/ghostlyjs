import { GhostlyProvider } from "ghostlyjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import data from "../ghostly.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Playground for Ghostly",
  description:
    "A playground for the Ghostly library, demonstrating its usage in a Next.js application.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GhostlyProvider data={data}>{children}</GhostlyProvider>
      </body>
    </html>
  );
}
