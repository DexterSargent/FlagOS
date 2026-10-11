import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { LeagueProvider } from "@/lib/leagueContext";
import RoleSwitcherBar from "@/components/RoleSwitcherBar";
import LeagueCustomizerModal from "@/components/LeagueCustomizerModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlagOS | Operating System for Flag Football Leagues",
  description: "The complete operating system for flag football leagues: schedules, live play-by-play scorekeeper, team portals, and automated stat leaderboards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white" suppressHydrationWarning>
        <AuthProvider>
          <LeagueProvider>
            <RoleSwitcherBar />
            {children}
            <LeagueCustomizerModal />
          </LeagueProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
