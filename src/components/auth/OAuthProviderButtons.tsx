"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth, type OAuthProviderId } from "@/lib/authContext";

interface ProviderDef {
  id: OAuthProviderId;
  label: string;
  /** Brand mark rendered as inline SVG. */
  icon: React.ReactNode;
  /** Tailwind classes for the button surface. */
  className: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "google",
    label: "Google",
    className: "bg-white hover:bg-neutral-200 text-black",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
        <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    className: "bg-black hover:bg-neutral-900 text-white border border-white/20",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
  },
  {
    id: "microsoft",
    label: "Microsoft",
    className: "bg-white hover:bg-neutral-200 text-black",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#7FBA00" d="M13 1h10v10H13z" />
        <path fill="#00A4EF" d="M1 13h10v10H1z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    className: "bg-[#1877F2] hover:bg-[#166fe0] text-white",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
      </svg>
    ),
  },
  {
    id: "twitter",
    label: "X",
    className: "bg-black hover:bg-neutral-900 text-white border border-white/20",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
        <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" />
      </svg>
    ),
  },
];

/**
 * The classic OAuth sign-in options. Each opens the provider's popup; the account is matched
 * to a league/team by email after sign-in, same as Google.
 */
export default function OAuthProviderButtons({ onSuccess }: { onSuccess?: (defaultPath?: string) => void }) {
  const { loginWithProvider } = useAuth();
  const [active, setActive] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState("");

  const handle = async (provider: OAuthProviderId) => {
    setError("");
    setActive(provider);
    try {
      const result = await loginWithProvider(provider);
      if (result.success) {
        onSuccess?.(result.defaultPath);
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setActive(null);
    }
  };

  return (
    <div className="w-full space-y-2.5">
      {error && (
        <p role="alert" className="w-full text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg font-medium">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-tour={`login-${p.id}`}
            onClick={() => void handle(p.id)}
            disabled={active !== null}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all active:scale-98 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${p.className}`}
          >
            {p.icon}
            <span>{active === p.id ? "Signing in..." : `Continue with ${p.label}`}</span>
            {active === p.id && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>
    </div>
  );
}
