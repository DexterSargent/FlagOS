import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider } from "@/lib/themeContext";
import { LeagueProvider } from "@/lib/leagueContext";
import GlobalShell from "@/components/GlobalShell";
import AuthGuard from "@/components/AuthGuard";
import ThrottleNotice from "@/components/ThrottleNotice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3CA505",
};

export const metadata: Metadata = {
  title: "FlagOS | Operating System for Flag Football Leagues",
  description: "The complete operating system for flag football leagues: schedules, live play-by-play scorekeeper, team portals, and automated stat leaderboards.",
  icons: {
    icon: "/flagos-emblem-512.png",
    shortcut: "/favicon.ico",
    apple: "/flagos-emblem-512.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-150 w-full max-w-full overflow-x-clip">
        <AuthProvider>
          <ThemeProvider>
            <LeagueProvider>
              <AuthGuard>
                <a
                  href="#main-content"
                  className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:rounded-lg focus-visible:bg-white dark:focus-visible:bg-slate-900 focus-visible:px-4 focus-visible:py-3 focus-visible:text-slate-900 dark:focus-visible:text-white focus-visible:shadow-lg focus-visible:border focus-visible:border-slate-300 dark:focus-visible:border-slate-700"
                >
                  Skip to main content
                </a>
                <GlobalShell>
                  {children}
                </GlobalShell>
              </AuthGuard>
              <ThrottleNotice />
            </LeagueProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
