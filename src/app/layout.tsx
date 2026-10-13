import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider } from "@/lib/themeContext";
import { LeagueProvider } from "@/lib/leagueContext";
import RoleSwitcherBar from "@/components/RoleSwitcherBar";
import LeagueCustomizerModal from "@/components/LeagueCustomizerModal";
import GlobalShell from "@/components/GlobalShell";
import AuthGuard from "@/components/AuthGuard";

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('flagos_theme_mode_v2');
                  // Default to 'dark' for first-time visitors with no saved preference
                  var mode = (saved === 'dark' || saved === 'light' || saved === 'system') ? saved : 'dark';
                  var resolved = mode === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : mode;
                  var root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(resolved);
                  root.setAttribute('data-theme', resolved);
                  root.style.colorScheme = resolved;
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-150" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <LeagueProvider>
              <AuthGuard>
                <RoleSwitcherBar />
                <GlobalShell>
                  {children}
                </GlobalShell>
                <LeagueCustomizerModal />
              </AuthGuard>
            </LeagueProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
