"use client";

import { Navigation } from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { findVenue, mapsSearchUrl } from "@/lib/leaguePublicProfile";

/** Shows a Directions link (and optional notes) when the game's location matches a league venue with an address. */
export default function VenueDirections({
  location,
  showNotes = false,
  inLink = false,
  className = "",
}: {
  location?: string;
  showNotes?: boolean;
  /** Set when rendered inside another link: anchors cannot be nested, so a link-role span is used. */
  inLink?: boolean;
  className?: string;
}) {
  const { settings } = useLeague();
  const venue = findVenue(settings.venues, location);
  if (!venue?.address) return null;
  const url = mapsSearchUrl(venue.address);
  const linkClass = "inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer";
  const label = (
    <>
      <Navigation className="w-3 h-3 shrink-0" aria-hidden />
      <span className="truncate">Directions</span>
    </>
  );
  const openDirections = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <span className={`inline-flex flex-col gap-0.5 min-w-0 ${className}`}>
      {inLink ? (
        <span
          role="link"
          tabIndex={0}
          title={venue.address}
          onClick={openDirections}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openDirections(e);
          }}
          className={linkClass}
        >
          {label}
        </span>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={venue.address}
          onClick={(e) => e.stopPropagation()}
          className={linkClass}
        >
          {label}
        </a>
      )}
      {showNotes && (
        <span className="text-[11px] text-[var(--text-muted)] break-words">
          {venue.address}
          {venue.notes ? ` \u00b7 ${venue.notes}` : ""}
        </span>
      )}
    </span>
  );
}
