"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Building2 } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

export const PRICING_FAQS: FaqItem[] = [
  {
    q: "How does the per-team pricing work for leagues?",
    a: "A League Subscription has a predictable $40/month baseline fee plus $20/month for each active team. You can easily adjust your team count as divisions expand or contract. Most importantly, every team in your league receives their own private Team Portal (complete with stats, roster hub, and up to 5 playbooks) at no extra charge to the coaches.",
  },
  {
    q: "What happens during the off-season? Can we pause our subscription?",
    a: "Yes. FlagOS is built specifically for seasonal flag football leagues. You can pause or cancel your subscription at the conclusion of a season. All your league historical data, player career records, box scores, and playbooks remain safely stored and immediately reactivate when your next season begins.",
  },
  {
    q: "Do coaches or players have to pay anything if our league is subscribed?",
    a: "No. When the league is subscribed, all member teams and coaches receive full Team Plan access for free through the league license. Coaches can manage their rosters, build playbooks, and export wristbands without paying a cent.",
  },
  {
    q: "Are there any limits on roster sizes or headcount fees?",
    a: "Rosters hold up to five players per spot on the field: 25 players for 5v5, 35 for 7v7 and 40 for 8v8. There are never per-player fees, per-athlete roster charges or registration penalties.",
  },
  {
    q: "Can an independent team join a league later without losing playbooks or stats?",
    a: "Yes. An independent team can join a FlagOS league without starting over. Its roster, playbooks and recorded player stats stay with the team.",
  },
  {
    q: "Do parents, fans, or spectators need a subscription to view games?",
    a: "Never. Public box scores, live play-by-play tickers, league standings, and stat leaderboards are 100% free and open for fans, parents, and recruiters to follow on any device with no login or app download required.",
  },
  {
    q: "What sideline equipment or devices do I need on gameday?",
    a: "Any smartphone, tablet, or laptop with a web browser works. No special hardware, proprietary timers, or app store downloads are required. A coach can record plays without running a game clock.",
  },
  {
    q: "What if we play at a park with spotty or weak cell service?",
    a: "You can download and print clean PDF call sheets and wristband inserts before heading to the field. For live scoring, you need an internet connection. If service is unreliable, record plays on paper and enter them after the game.",
  },
  {
    q: "Can FlagOS accommodate custom rules like 5v5, 7v7, youth, or adult divisions?",
    a: "Yes. Whether you run non-contact 5v5 youth divisions, competitive adult 7v7 formats, or recreational co-ed brackets, FlagOS supports customizable rush counts, blitz rules, clock lengths, and field dimensions.",
  },
  {
    q: "Can coaches share playbooks and wristband inserts with their players?",
    a: "Yes. Coaches can export formatted wristband inserts (in 1, 2, 4, or 8-play layouts) and full-page play sheets directly to PDF, or share read-only play links with their athletes ahead of practice.",
  },
  {
    q: "What if teams drop out or new teams join mid-season?",
    a: "League subscriptions prorate cleanly. If you add a team mid-season, you simply adjust your team slider up and they receive an instant team portal. If a team drops, reduce your active team count and your next monthly invoice adjusts down automatically.",
  },
  {
    q: "Who owns our league and team data? Can we export our records?",
    a: "You own 100% of your data. You can export complete game logs, player career stats, box scores, and league standings anytime. We never sell your team contact information or advertise third-party products to your players and families.",
  },
  {
    q: "How difficult is it to migrate our league from spreadsheets or another system?",
    a: "FlagOS makes setup fast. You can set up teams and import schedules in minutes. Our onboarding wizard walks you through roster entry, venue locations, and custom game rules.",
  },
];

export const PricingFaqAccordion = memo(function PricingFaqAccordion() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="space-y-12">
      {/* FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
      <section data-tour="pricing-faq" className="space-y-6 pt-8 border-t border-neutral-200 dark:border-white/10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-800 dark:text-[#60a5fa]">
            Common Questions
          </span>
          <h2 className="text-2xl md:text-3xl font-black uppercase text-neutral-950 dark:text-white tracking-tight">
            Pricing &amp; Season FAQ
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-xs md:text-sm">
            Clear answers on how team portals work, off-season billing pauses, and free spectator access.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {PRICING_FAQS.map((faq, index) => {
            const isOpen = expandedFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 shadow-sm overflow-hidden transition-all"
              >
                <button
                  type="button"
                  id={`pricing-faq-question-${index}`}
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`pricing-faq-answer-${index}`}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-neutral-950 dark:text-white text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-blue-600 dark:text-[#60a5fa]" : ""
                    }`}
                  />
                </button>
                <div
                  id={`pricing-faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`pricing-faq-question-${index}`}
                  hidden={!isOpen}
                  className="px-5 pb-4 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-neutral-100 dark:border-white/5 pt-3"
                >
                  {faq.a}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Multi-League & Multi-Team Explanation Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#60a5fa] shrink-0 mt-1">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-950 dark:text-white">Run Multiple Leagues or Independent Teams</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-xs md:text-sm mt-1 leading-relaxed">
              Run multiple leagues, weekend tournaments or separate travel teams under one login. Switch between your leagues and teams from the top menu.
            </p>
          </div>
        </div>
        <Link
          href="/league/default?demo=true"
          className="px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-bold whitespace-nowrap border border-neutral-300 dark:border-white/10 transition-colors shadow-sm shrink-0"
        >
          Explore Active Demo
        </Link>
      </div>
    </div>
  );
});

export default PricingFaqAccordion;

