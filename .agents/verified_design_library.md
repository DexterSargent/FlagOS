# FlagOS Verified Design System & Architecture Map
*Maintained per `/design-verifier` workflow: "As you rework design, build a map of the choices that I make and the broader architecture that I have verified to continue to inform how you build. If I ask you to remove design that was previously verified, remove it from the library."*

---

## 1. Global Layout & Theme Architecture
- **Root Token Pattern**: Always use semantic background and text tokens: `bg-neutral-50 dark:bg-[#07090E] text-neutral-900 dark:text-neutral-100`. NEVER hardcode `bg-black` at root, as it breaks light-mode inversion.
- **Ambient Glows**: Set ambient decorative blur glows to `opacity-20 dark:opacity-100` so light mode stays crisp and readable while dark mode retains atmospheric depth.
- **Card Styling Tokens**:
  - Light Mode: `bg-white border-neutral-200/80 shadow-sm text-neutral-900`
  - Dark Mode: `dark:bg-neutral-900/80 dark:border-white/10 dark:text-neutral-100`
  - Eliminating "Nested Box Clutter": Avoid placing dark gray bordered boxes inside bordered cards. Use soft tinted backgrounds (`bg-emerald-500/[0.06]`, `bg-blue-500/[0.06]`, `bg-red-500/[0.04]`) with subtle borders.

---

## 2. Verified Pricing Page (`/pricing`) Component Choices

### Component 1: Top Navigation Bar & Hero Header
- **Status**: **VERIFIED (Approved as-is)**
- **Header Choices**:
  - Logo: Standard FlagOS SVG mark with green "OS".
  - Active Link: `#3CA505` brand green text without pill or icon clutter.
  - Action Cluster: Theme toggle (`Switch to Light/Dark Mode`) and clean `Sign In` button.
- **Hero Section Choices**:
  - Eyebrow Pill: `TRANSPARENT, PREDICTABLE RATES` with subtle green border.
  - Headline: `PLANS AVAILABLE FOR TEAMS & LEAGUES` (`text-3xl sm:text-5xl lg:text-6xl font-black uppercase`).
  - Subhead: Grounded coach copy with bold emphasis on `every franchise gets full Team Plan access at 50% off`.
  - Guarantee Pills: Responsive 3-pill cluster (`✓ Month-to-month, cancel anytime`, `✓ Zero per-player or roster surcharges`, `✓ Free spectator access`).

### Component 2: Side-by-Side Pricing Cards (Team Plan vs League Plan)
- **Status**: **VERIFIED (Updated with Strict Symmetrical Section Alignment)**
- **Core Architecture Rule**: **Sections must begin and end at the exact same vertical position on both cards.**
  - **Section A (Card Header & Subtitle)**:
    - Balanced 3-line coach copy (`sm:min-h-[52px]`) so the top divider sits on the identical horizontal baseline.
    - Badges: `Flat Rate` on Team; `50% Bulk Rate` on League.
  - **Section B (Pricing, Capacity & Calculator Block)**:
    - Symmetrical 4-row layout:
      1. Row 1: Price (`$40 / month` vs `${totalLeagueMonthly} / month`) + Rate badge (`Single Flat Fee` vs `$40 base + $20/team`).
      2. Row 2: Capacity label (`Roster Capacity: Unlimited Players` vs `Active Teams: X Teams`).
      3. Row 3: Height-matched row (`h-8`): Team gets a coach flexibility status bar (`Tournament & Scrimmage Ready • Month-to-Month`) matching the exact height of the League interactive stepper/slider.
      4. Row 4: Symmetrical savings callout (`Standalone Value: $85/mo | Save $45/mo (53% Off)` vs `Standalone Value: $X/mo | Save $Y/mo (Z% Off)`).
  - **Section C (Inclusions Header)**:
    - `INCLUDED IN TEAM PLAN` vs `INCLUDED IN LEAGUE PLAN` start on the exact same horizontal baseline (`h-5`).
  - **Section D (8 Inclusions Bullets)**:
    - Each bullet row is height-matched (`sm:min-h-[38px]`) so bullet N on Team aligns with bullet N on League across the entire card.
  - **Section E (CTA Action Buttons)**:
    - `Subscribe Team Portal ($40/mo)` and `Launch & Subscribe League ($X/mo)` are horizontally aligned at the bottom across desktop and tablet screens.

### Component 3: Value Comparison ("What It Would Cost To Build This Stack From Scratch")
- **Status**: **VERIFIED & APPROVED (Explicit dollar figures for all fragmented tools, zero "Included" labels, height-matched 6 rows, monthly + annual savings)**
- **Architectural Rules**:
  - **No "Circuit" Terminology**: NEVER use "circuit" or "circuits". Refer strictly to "leagues", "10-team league", "divisions", or "teams".
  - **Direct Monthly Totals & Authentic Market Valuation**:
    - Left Panel (Single Team Breakdown):
      - Row 1: Playbook Builder & Route Designer ($20/mo) <---> 5 Playbooks & Route Designer
      - Row 2: Roster Hub & Depth Charts ($10/mo) <---> Full Roster Hub & Depth Charts
      - Row 3: Sideline Stat Logger & Box Scores ($40/mo) <---> Sideline Stat Logger & Box Scores
      - Row 4: Live Parent & Fan Passes ($10/mo) <---> Free spectator links for parents
      - Row 5: Call Sheets & Wristband Inserts ($10/mo) <---> One-click PDF call sheet export
      - Row 6: Career Stats & Season Logs ($10/mo) <---> Multi-season player career stats
      - Total: $100/mo standalone value vs $40/mo FlagOS Flat Rate (Save $60/mo or $720/year).
    - Right Panel (10-Team League Savings):
      - Row 1: 10 Team Portals ($400/mo - priced at 10 × $40 FlagOS team rate) <---> 10 Private Team Portals with Playbooks
      - Row 2: League Hub & Registration ($90/mo + player cuts) <---> Public League Hub ($0 per-player fees)
      - Row 3: Live Stats & Play-by-Play ($70/mo) <---> Live updating play-by-play & box scores
      - Row 4: Automated Scheduler ($35/mo) <---> Automated scheduler & conflict solver
      - Row 5: Standings & Brackets ($25/mo) <---> Multi-way tiebreakers & seeded brackets
      - Row 6: League Leaderboards ($30/mo) <---> League leaderboards & career stats
      - Total: $650/mo combined value vs $240/mo FlagOS Flat Rate (Save $410/mo or $4,920/year).
  - **Symmetrical 1-to-1 Ordering**: Every row in Fragmented Tools directly aligns with its exact FlagOS counterpart in the identical position across both cards.
  - **Zero "Included" in Fragmented Tools**: Fragmented Tools column strictly shows commercial competitor market prices.
  - **Component 2 Card Row 4 Link**: Symmetrical savings callout on Team Card reflects `Standalone Value: $100/mo | Save $60/mo ($720/yr) • 60% Off`.

### Component 4: Feature Comparison Matrix ("Compare Team & League Plans")
- **Status**: **VERIFIED & APPROVED (Coach-First Plain English & Complete 30-Feature Inventory)**
- **Tone & Copy Framing**:
  - Eyebrow: `Side-by-Side Breakdown`
  - Headline: `Compare Team & League Plans`
  - Subhead: *"Everything you need to know about what is included for individual teams versus full league setups."*
  - Replaced all technical jargon ("Asynchronous/Synchronous Mode", "Pipeline", "Migration", "Turnkey", "Role-Based Access Control") with plain-English coach and director language.
- **Color Scheme Standards**:
  - Team Column: Pure Emerald `#3CA505` (`text-emerald-800 dark:text-emerald-400`, `bg-emerald-500/10 border-emerald-500/20`, checkmarks `text-emerald-600 dark:text-emerald-400`).
  - League Column: Pure Royal Blue `#3B82F6` (`text-blue-800 dark:text-[#60a5fa]`, `bg-blue-500/10 border-blue-500/20`, checkmarks `text-blue-600 dark:text-[#60a5fa]`).
  - NO CYAN: Removed outdated cyan references throughout matrix and table headers.
- **5 Filter Categories**:
  1. `All Features (30)`
  2. `Team & Roster Hub` (`team` - 6 features)
  3. `Playbook Designer` (`playbook` - 6 features)
  4. `Sideline Stats & Clocks` (`stats` - 7 features)
  5. `League Operations` (`league` - 11 features)
- **Layout Architecture**:
  - Desktop View (`hidden md:block`): 3-column table with semantic header tokens (`bg-neutral-50 dark:bg-black/60`), styled capability titles, and mono badges.
  - Mobile View (`md:hidden`): Individual card stack per feature with side-by-side pill badges for Team and League statuses, preventing horizontal clipping.

### Component 5: Pricing & Season FAQ Accordion & Multi-League Banner
- **Status**: **VERIFIED & APPROVED (Comprehensive 14-Question FAQ + Grounded Multi-League Banner)**
- **Tone & Copy Framing**:
  - Eyebrow: `Common Questions` (`text-blue-800 dark:text-[#60a5fa]`)
  - Headline: `Pricing & Season FAQ`
  - Subhead: *"Clear answers on how team portals work, off-season billing pauses, and free spectator access."*
  - Comprehensive 14-question inventory directly addressing authentic real-world commissioner, coach, and parent questions (roster limits, low-cell park access, sideline devices, 5v5/7v7 rule adaptations, playbook exports, mid-season roster scaling, data ownership, spreadsheet switching).
  - Multi-League Banner: Plain-English title `Run Multiple Leagues or Independent Teams` (replaced technical "Architecture" phrasing) with blue `Building2` icon container.
- **Color Scheme & Interaction Standards**:
  - Accordion Cards: `rounded-2xl bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 shadow-sm`.
  - Open State: Chevron rotates 180° with `text-blue-600 dark:text-[#60a5fa]`.
  - Multi-League Banner: Rounded card with `bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-[#60a5fa]` icon container and dark neutral CTA `Explore Active Demo`. Zero cyan.

---

### Component 6: Checkout Modals & Development Notice
- **Status**: **VERIFIED & APPROVED (High-Contrast Light/Dark Theming, Emerald Team & Royal Blue League Branding, Zero Cyan)**
- **Tone & Copy Framing**:
  - Team Checkout Modal: `Subscribe Team Portal` — *"Single monthly fee • Full stats tracking, roster hub & up to 5 playbooks"*.
  - League Checkout Modal: `Subscribe League Portal` — *"Baseline fee + per-team scaling • Includes full team hubs for every team"*.
  - Development Notice Modal: `FlagOS is still in development` — *"Subscriptions and purchases are not available yet. No payment will be taken and no league or team will be created. You can continue exploring the demo league while we finish building the service."*
- **Design & Theming Standards**:
  - Containers: High-contrast modal card `bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white rounded-3xl p-6 md:p-8 shadow-2xl`.
  - Form Fields: High-contrast inputs `bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white outline-none`.
  - Team Accent: Pure Emerald `#3CA505` (`border-emerald-500/40`, `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`, `focus:border-emerald-500`, button `bg-emerald-600 hover:bg-emerald-500 text-white font-black`).
  - League Accent: Royal Blue `#3B82F6` (`border-blue-500/40`, `bg-blue-500/10 text-blue-600 dark:text-[#60a5fa]`, `focus:border-blue-500`, button `bg-blue-600 hover:bg-blue-500 text-white font-black`).
  - Development Notice: Clean royal blue `Sparkles` icon badge and high-contrast actions (`bg-blue-600 text-white` vs neutral `border-neutral-200 dark:border-white/10`).
  - Zero Cyan: Removed all cyan borders, glow effects, button backgrounds, and text colors across all modal flows.

---

## 3. Page Status: COMPLETE (`/pricing`)
All 6 components of the pricing page have been verified and approved sequentially through `/design-verifier`:
1. Top Navigation Bar & Hero Header
2. Side-by-Side Pricing Cards (Team vs League)
3. Value Comparison Breakdown ("What It Would Cost To Build This Stack From Scratch")
4. Feature Comparison Matrix ("Compare Team & League Plans" - 30 Features across 5 Categories)
5. Pricing & Season FAQ Accordion (14 Questions) & Multi-League Banner
6. Checkout Modals (Team Modal, League Modal, Development Notice)

---

## 4. Playbook Pages Architecture & Component Verification

### Component 1: Playbook Studio Header & Team Sub-Navigation Bar
- **Status**: **APPROVED**
- **Architectural Rules & Verified Choices**:
  - **Football Crest Geometry (`TeamAssets.tsx`)**:
    - Authentic Lucide-grade American football icon with pointed ends (`vesica piscis` outline):
      - **Pointed Body Outline**: `M21 3c-.8-.8-3-1.2-5.8-.9s-6 1.6-8.8 4.4-4 6-4.4 8.8.1 5 .9 5.8 3 1.2 5.8.9 6-1.6 8.8-4.4 4-6 4.4-8.8-.1-5-.9-5.8`.
      - **End Stripes**: Curved tip stripes near each pointed tip (`M15.3 2.1c.8 3.3 3.4 5.8 6.6 6.6` and `M8.7 21.9c-.8-3.3-3.4-5.8-6.7-6.7`).
      - **Longitudinal Seam**: Along the length axis (`M6.4 17.6 9 15` and `M15 9 17.6 6.4`).
      - **Cross Laces**: Perpendicular to the longitudinal axis (`m8.1 13.9 2 2`, `m11 11 2 2`, `m13.9 8.1 2 2`).
    - All demo teams and teams without custom logos default to the FootballIcon rendered in their primary team color.
  - **Single Consolidated Header Controls (`RoleSwitcherContent.tsx` & `TeamNavBar.tsx`)**:
    - **No Duplicate Controls**: Removed `Settings` and `ThemeToggle` from `RoleSwitcherContent`.
    - **Dedicated Role Switcher**: The role switcher is strictly limited to context and role switching (`Exit Demo`, `League Admin`, `Team Admin`, `Player`, `Spectator`, `Franchise`, `Athlete`, `Reset Session`).
    - **Header as Single Source of Truth**: Theme toggling and site controls reside cleanly in the navigation header bar (`TeamNavBar` and `LeagueHeader`).
  - **High-Contrast Icon Badges (`page.tsx` & `globals.css`)**:
    - Avoid dark-on-dark hardcoded gradients for title badges. Use a franchise-tinted background (`${palette.primary}1A`) and crisp border (`${palette.primary}50`) with the icon styled in `${palette.primary}` for high contrast in both dark and light modes.
    - Global light-mode SVG rule avoids overriding icons in colored background containers (`[class*="bg-"]` and `[style*="background"]`).

### Component 2: Playbook Hub & Formations Grid
- **Status**: **APPROVED**
- **Architectural Rules & Verified Choices**:
  - **Single Contextual Back Button**:
    - **Level 1 (Playbook Hub)**: `< {teamName} Portal` (leads back to team overview).
    - **Level 2 (Formations Dashboard)**: `< All Playbooks` (leads back to all playbooks).
    - **Level 3 (Plays Grid)**: `< Formations` (leads back to formations list).
    - No redundant secondary back buttons or breadcrumb bars inside card containers.
  - **Condensed Top Header (Saved >50% Vertical Space)**:
    - Merged redundant sub-toolbar (`data-tour="formations-toolbar"`) directly into the Level 2 top header.
    - Header combines Playbook Title with inline edit pencil, squad format badge (`5v5 FLAG FORMAT`), unit badge (`OFFENSE`/`DEFENSE`), and inline action cluster (`Show Opposing Defense`, `Print Armbands`, `Guided Tour`, `+ Add Formation`, `Saved to Cloud` indicator).
    - Guided tour selector `data-tour="formations-toolbar"` preserved on the condensed top header row.
  - **Display Mode System Token Compliance**:
    - Playbook Hub cards and Formation cards use theme tokens: `bg-white dark:bg-[#0B0F19] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white`.
    - Empty states use theme tokens with high-contrast franchise-gradient CTA buttons.
  - **Formation Pre-Snap Alignment Mini-Pitch**:
    - Formation cards render real-time SVG mini-pitch displaying scrimmage line (LOS), 7-yard rush line, and player positions (`C`, `QB`, `X`, `R`, `Z`) with `SEE PLAYS (X)` drill-down.

---

### Component 3: Formation Plays Grid & Play Cards
- **Status**: **APPROVED**
- **Architectural Rules & Verified Choices**:
  - **Single Contextual Back Button**:
    - Header uses `< Formations` to step back cleanly from Level 3 to Level 2 without redundant back bars.
  - **Condensed Context Header**:
    - Compact single-row header featuring Formation Title with franchise tint (`{Formation Name} PLAYS`), play count subtext, and action cluster (`Print Armbands`, `Guided Tour`, `+ New Play`, `Saved to Cloud`).
  - **Display Mode System Token Compliance**:
    - Play cards use `bg-white dark:bg-[#0B0F19] hover:bg-neutral-50 dark:hover:bg-[#0E1424] border border-neutral-200 dark:border-white/10 hover:border-cyan-500/50`.
    - Text hierarchy: `text-neutral-900 dark:text-white` for play titles, `text-neutral-500 dark:text-neutral-400` for situation and formation tags.
    - Category select dropdown: `bg-neutral-100 dark:bg-black/40 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-cyan-300`.
  - **Mini-Pitch Route Previews**:
    - Real-time turf aspect-ratio (`10/7`) preview displaying pre-snap alignments and vector route arrows for every player.
  - **Quick Action Footer**:
    - In-place category reassignment dropdown, duplicate play action, and delete button for rapid coaching management.

---

### Component 4: Play Canvas Editor & Toolbars
- **Status**: **APPROVED**
- **Architectural Rules & Verified Choices**:
  - **Multi-Device Screen Formatting (`screen-formatting.md`)**:
    - **Desktop (`xl:`)**: Side-by-side studio layout (`xl:flex-row`). Field canvas dominates left area; tactical dock sits fixed on right (380px) within a single fixed viewport (`xl:h-dvh overflow-hidden`).
    - **Tablet Portrait (768px)**: Stacked studio layout (`min-h-screen overflow-y-auto`). Field canvas takes full screen width; tactical dock is stacked below. `TeamNavBar` team title breakpoint set to `lg:block` to prevent tab collision at 768px.
    - **Mobile Portrait (390px)**: Fluid vertical scroll (`min-h-screen overflow-y-auto`). Top toolbar items wrap cleanly without clipping; canvas maintains proper proportions; tactical dock and scrubber controls are accessible via scrolling without sticky interference.
  - **Single Contextual Back Navigation**:
    - `<` single button returns cleanly to the Level 3 formation plays grid without broken history or breadcrumb redundancy.
  - **Top Studio Command Bar (`data-testid="designer-toolbar"`)**:
    - Theme tokens: `bg-white dark:bg-[#0B0F19] border border-neutral-200 dark:border-white/10 rounded-2xl`.
    - Direct inline edit play name input (`bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white`).
    - Formation category selector (moves play between formations dynamically).
    - Situation tag selector (`Standard`, `3rd & Long`, `Goal Line`, etc.).
    - Defensive simulation toggle (`Opponent On/Off`), rule alignment status badge (`Legal / Warnings`), and walkthrough guide button.
    - Integrated right action cluster: Duplicate, Delete, `+ New Play` (franchise primary CTA), `Coach Q&A` modal trigger, `Print` sheets, and real-time auto-save indicator.
  - **Turf Field Canvas**:
    - 0-50 yd grid, end zone, 7-yd rush cone guideline, and line of scrimmage (LOS).
    - Draggable player nodes (`C`, `QB`, `X`, `R`, `Z`) with franchise accents, active selection halos, and vector route arrows.
  - **Simulation Playback Bar**:
    - High-contrast controls: `RUN PLAY` / `PAUSE`, rewind button, speed toggles (`0.5x`, `1x`, `1.5x`), and timeline scrubber.
  - **Tactical Player Dock / Inspector**:
    - Player tab pills (`C`, `QB`, `X`, `R`, `Z`) with active ring highlights, route name indicator, `Position Notes` modal trigger, and `Draw Route` shortcut button launching the Route Customizer Drawer (Component 5).

---

### Component 5: Route Customizer & Presets Drawer
- **Status**: **IN PROGRESS / UNDER REVIEW**

