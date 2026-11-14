import { LoadingProvider } from "@/components/loading";
import Nav from "@/components/nav";
import { GhostlyProvider } from "ghostlyjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import logo from "../../../assets/logo.svg";
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
  // The repo logo as favicon.
  icons: { icon: logo.src },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <GhostlyProvider data={data}>
          <LoadingProvider>
            <Nav />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-8 sm:py-14">
              {children}
            </main>
          </LoadingProvider>
        </GhostlyProvider>
      </body>
    </html>
  );
}
