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
            {/* Full width up to 2xl with more padding per breakpoint, so
                the content is narrower or wider at every breakpoint. */}
            <main className="mx-auto flex w-full max-w-384 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10 md:gap-12 md:px-8 lg:py-14 xl:px-10 2xl:px-12">
              {children}
            </main>
          </LoadingProvider>
        </GhostlyProvider>
      </body>
    </html>
  );
}
