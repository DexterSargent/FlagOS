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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('flagos_theme_mode_v2');
                  var mode = (saved === 'dark' || saved === 'light') ? saved : 'dark';
                  var root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(mode);
                  root.setAttribute('data-theme', mode);
                  root.style.colorScheme = mode;
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-150 w-full max-w-full overflow-x-clip">
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
