import type { ToolWalkthrough } from "@/lib/walkthroughData";

export const LANDING_WALKTHROUGH: ToolWalkthrough = {
  "id": "public-home",
  "toolName": "FlagOS",
  "subtitle": "Players, coaches and commissioners can explore FlagOS, compare plans and find a public league here.",
  "steps": [
    {
      "id": "public-home-overview",
      "targetSelector": "",
      "title": "Welcome to FlagOS",
      "description": "Players, coaches and commissioners can explore FlagOS, compare plans and find a public league here."
    },
    {
      "id": "public-home-public-nav",
      "targetSelector": "[data-tour=\"public-nav\"]",
      "title": "Find your way around",
      "description": "These links stay at the top of the public home page.",
      "details": [
        {
          "label": "Features",
          "text": "Jumps to the interactive tools below."
        },
        {
          "label": "Demo League",
          "text": "Opens the example league to explore without changing a real league."
        },
        {
          "label": "League Directory",
          "text": "Finds public leagues near you."
        },
        {
          "label": "My Story",
          "text": "Opens the founder story when your account has access."
        },
        {
          "label": "Pricing",
          "text": "Compares team and league plans."
        },
        {
          "label": "Toggle Navigation Menu",
          "text": "Shows these links on phones."
        }
      ]
    },
    {
      "id": "public-home-public-controls",
      "targetSelector": "[data-tour=\"public-controls\"]",
      "title": "Your account and display",
      "description": "Use the controls beside the navigation.",
      "details": [
        {
          "label": "Guide",
          "text": "Reopens this page guide.",
          "targetSelector": "[data-testid=\"page-guide-button\"]"
        },
        {
          "label": "Theme toggle",
          "text": "Changes between light and dark mode on this device."
        },
        {
          "label": "Platform Admin",
          "text": "Opens platform management for authorized administrators."
        },
        {
          "label": "League Portal",
          "text": "Opens your current league when signed in."
        },
        {
          "label": "Sign In",
          "text": "Opens email and Google sign-in."
        },
        {
          "label": "Demo League",
          "text": "Opens the example league."
        }
      ]
    },
    {
      "id": "public-home-landing-intro",
      "targetSelector": "[data-tour=\"landing-intro\"]",
      "title": "Explore before you join",
      "description": "Start with pricing or a hands-on example.",
      "details": [
        {
          "label": "View Pricing",
          "text": "Opens the full plan comparison."
        },
        {
          "label": "Explore Demo League",
          "text": "Opens the example league so you can explore its pages."
        }
      ]
    },
    {
      "id": "public-home-landing-plans",
      "targetSelector": "[data-tour=\"landing-plans\"]",
      "title": "Team or league?",
      "description": "Compare the two subscription summaries.",
      "details": [
        {
          "label": "Team Subscription",
          "text": "Describes the tools for one independent team."
        },
        {
          "label": "League Subscription",
          "text": "Describes tools for a whole league and its teams."
        },
        {
          "label": "View Pricing",
          "text": "Opens detailed prices, features and subscription options for either plan."
        }
      ]
    },
    {
      "id": "public-home-landing-demo-tabs",
      "targetSelector": "[data-tour=\"landing-demo-tabs\"]",
      "title": "Choose a tool to try",
      "description": "Switch between the interactive examples.",
      "details": [
        {
          "label": "Game scoring / Scoring",
          "text": "Tries recording plays and statistics."
        },
        {
          "label": "Playbook Studio / Playbook",
          "text": "Tries drawing formations and routes."
        },
        {
          "label": "Schedule Builder / Schedule",
          "text": "Tries arranging games."
        },
        {
          "label": "League Dashboard / Dashboard",
          "text": "Previews the commissioner's league dashboard."
        }
      ]
    },
    {
      "id": "public-home-landing-scoring-modes",
      "targetSelector": "[data-tour=\"landing-scoring-modes\"]",
      "title": "Choose a scoring style",
      "description": "These options appear in the scoring example.",
      "details": [
        {
          "label": "Log after the game",
          "text": "Records plays without running a game clock."
        },
        {
          "label": "Live scoring",
          "text": "Shows the game and play clocks, ball position and downs."
        }
      ]
    },
    {
      "id": "public-home-landing-demo-reset",
      "targetSelector": "[data-tour=\"landing-demo-reset\"]",
      "title": "Start the example over",
      "description": "Examples are for practice, not real league records.",
      "details": [
        {
          "label": "Reset demo",
          "text": "Reloads the selected example and clears its current practice session."
        }
      ]
    },
    {
      "id": "public-home-landing-find",
      "targetSelector": "[data-tour=\"landing-find\"]",
      "title": "Play or watch",
      "description": "Shortcuts for players and fans. Private leagues are never listed; ask your organizer for their link.",
      "details": [
        {
          "label": "Find a League",
          "text": "Opens the directory of leagues that chose to be listed publicly."
        },
        {
          "label": "Find a Team",
          "text": "Shows leagues accepting free agents and a form to leave your details."
        },
        {
          "label": "Watch a Game",
          "text": "Opens a sample game from the demo league as a fan would see it."
        }
      ]
    },
    {
      "id": "public-home-public-footer",
      "targetSelector": "[data-tour=\"public-footer\"]",
      "title": "Useful links",
      "description": "Return to the main public pages from the footer.",
      "details": [
        {
          "label": "Demo League",
          "text": "Opens the example league."
        },
        {
          "label": "League Directory",
          "text": "Browses public leagues."
        },
        {
          "label": "Pricing",
          "text": "Compares subscriptions."
        },
        {
          "label": "Sign In",
          "text": "Opens sign-in."
        },
        {
          "label": "Try the Demo",
          "text": "Opens the example league."
        }
      ]
    }
  ]
};

export const PRICING_WALKTHROUGH: ToolWalkthrough = {
  "id": "public-pricing",
  "toolName": "Pricing",
  "subtitle": "Coaches and commissioners can compare subscriptions, estimate costs and review what each plan includes.",
  "steps": [
    {
      "id": "public-pricing-overview",
      "targetSelector": "",
      "title": "Welcome to Pricing",
      "description": "Coaches and commissioners can compare subscriptions, estimate costs and review what each plan includes."
    },
    {
      "id": "public-pricing-public-nav",
      "targetSelector": "[data-tour=\"public-nav\"]",
      "title": "Public navigation",
      "description": "Move between FlagOS pages.",
      "details": [
        {
          "label": "Features",
          "text": "Returns to the home page’s interactive examples."
        },
        {
          "label": "Demo League",
          "text": "Opens the example league."
        },
        {
          "label": "League Directory",
          "text": "Finds public leagues."
        },
        {
          "label": "Pricing",
          "text": "Returns to this comparison."
        },
        {
          "label": "Toggle menu",
          "text": "Opens these links on a phone."
        }
      ]
    },
    {
      "id": "public-pricing-public-controls",
      "targetSelector": "[data-tour=\"public-controls\"]",
      "title": "Account and appearance",
      "description": "These controls work just like on the home page.",
      "details": [
        {
          "label": "Guide",
          "text": "Reopens this guide.",
          "targetSelector": "[data-testid=\"page-guide-button\"]"
        },
        {
          "label": "Theme toggle",
          "text": "Changes the display theme."
        },
        {
          "label": "Platform Admin",
          "text": "Opens platform management for authorized accounts."
        },
        {
          "label": "League Portal",
          "text": "Returns to your active league."
        },
        {
          "label": "Sign In",
          "text": "Opens sign-in."
        }
      ]
    },
    {
      "id": "public-pricing-pricing-team",
      "targetSelector": "[data-tour=\"pricing-team\"]",
      "title": "One independent team",
      "description": "The Team Plan is a flat monthly price with no per-player fee.",
      "details": [
        {
          "label": "Subscribe Team Portal ($40/mo)",
          "text": "Opens setup for eligible preview accounts; other visitors see the development notice."
        },
        {
          "label": "Included in Team Plan",
          "text": "Lists roster, playbook, scoring, spectator and career-stat tools."
        }
      ]
    },
    {
      "id": "public-pricing-pricing-league",
      "targetSelector": "[data-tour=\"pricing-league\"]",
      "title": "Estimate a league subscription",
      "description": "The total updates with the number of teams: $40 plus $20 per team each month.",
      "details": [
        {
          "label": "Decrease team count",
          "text": "Removes one team, down to four."
        },
        {
          "label": "League team count slider",
          "text": "Chooses a capacity from 4 to 64 teams."
        },
        {
          "label": "Increase team count",
          "text": "Adds one team, up to 64."
        },
        {
          "label": "Launch & Subscribe League",
          "text": "Opens league setup for eligible preview accounts; other visitors see the development notice."
        }
      ]
    },
    {
      "id": "public-pricing-pricing-savings",
      "targetSelector": "[data-tour=\"pricing-savings\"]",
      "title": "Compare separate tools",
      "description": "These examples explain the displayed savings, not an extra bill.",
      "details": [
        {
          "label": "Single Team Breakdown",
          "text": "Compares the team subscription with the displayed value of separate tools."
        },
        {
          "label": "10-Team League Savings",
          "text": "Shows a ten-team example alongside the league subscription total."
        }
      ]
    },
    {
      "id": "public-pricing-pricing-features",
      "targetSelector": "[data-tour=\"pricing-features\"]",
      "title": "Compare included features",
      "description": "Filter the comparison to the tools you care about.",
      "details": [
        {
          "label": "All Features",
          "text": "Shows the entire comparison."
        },
        {
          "label": "Team & Roster Hub",
          "text": "Shows roster and team tools."
        },
        {
          "label": "Playbook Designer",
          "text": "Shows play design and printing tools."
        },
        {
          "label": "Sideline Stats & Clocks",
          "text": "Shows scoring and game-clock tools."
        },
        {
          "label": "League Operations",
          "text": "Shows tools for running a league."
        }
      ]
    },
    {
      "id": "public-pricing-pricing-faq",
      "targetSelector": "[data-tour=\"pricing-faq\"]",
      "title": "Pricing and season questions",
      "description": "Open a question to read its answer.",
      "details": [
        {
          "label": "FAQ question",
          "text": "Expands the answer; select it again to close it. Opening another question replaces the open answer.",
          "targetSelector": "button"
        }
      ]
    },
    {
      "id": "public-pricing-public-footer",
      "targetSelector": "[data-tour=\"public-footer\"]",
      "title": "Continue exploring",
      "description": "Use the footer links without starting a subscription.",
      "details": [
        {
          "label": "Demo League",
          "text": "Opens the example league."
        },
        {
          "label": "League Directory",
          "text": "Browses public leagues."
        },
        {
          "label": "Pricing Plans",
          "text": "Returns to this page."
        },
        {
          "label": "Sign In",
          "text": "Opens your account sign-in."
        }
      ]
    }
  ]
};

export const TEAM_SUBSCRIPTION_WALKTHROUGH: ToolWalkthrough = {
  "id": "subscribe-team",
  "toolName": "Team setup",
  "subtitle": "Preview setup for the selected subscription. Review the name, branding and monthly total before confirming.",
  "steps": [
    {
      "id": "subscribe-team-overview",
      "targetSelector": "",
      "title": "Welcome to Team setup",
      "description": "Preview setup for the selected subscription. Review the name, branding and monthly total before confirming."
    },
    {
      "id": "subscribe-team-subscribe-team-identity",
      "targetSelector": "[data-tour=\"subscribe-team-identity\"]",
      "title": "Name your team",
      "description": "Enter the details shown on the new portal.",
      "details": [
        {
          "label": "Team / Club Name",
          "text": "Names the portal."
        },
        {
          "label": "Team Shortcode",
          "text": "Adds a short abbreviation used throughout the portal."
        },
        {
          "label": "Close",
          "text": "Closes setup without submitting it."
        }
      ]
    },
    {
      "id": "subscribe-team-subscribe-team-logo",
      "targetSelector": "[data-tour=\"subscribe-team-logo\"]",
      "title": "Choose a logo",
      "description": "Use an image link or an image from your device.",
      "details": [
        {
          "label": "Team Logo / Crest (Optional)",
          "text": "Previews the selected logo."
        },
        {
          "label": "Paste image URL or upload below...",
          "text": "Uses an image address for the logo."
        },
        {
          "label": "Upload File",
          "text": "Chooses an image file on this device."
        },
        {
          "label": "Reset to FlagOS Logo",
          "text": "Removes your logo choice and restores the default."
        }
      ]
    },
    {
      "id": "subscribe-team-subscribe-team-colors",
      "targetSelector": "[data-tour=\"subscribe-team-colors\"]",
      "title": "Choose portal colors",
      "description": "Preview the colors before creating the portal.",
      "details": [
        {
          "label": "Primary Color",
          "text": "Choose a preset swatch or use the custom color picker."
        },
        {
          "label": "Secondary Color",
          "text": "Choose the accent color from swatches or the custom picker."
        },
        {
          "label": "Tertiary Color",
          "text": "Choose the third color from swatches or the custom picker."
        },
        {
          "label": "Preview",
          "text": "Shows your color combination."
        }
      ]
    },
    {
      "id": "subscribe-team-subscribe-team-visibility",
      "targetSelector": "[data-tour=\"subscribe-team-visibility\"]",
      "title": "Who can view the team?",
      "description": "Choose access before confirming.",
      "details": [
        {
          "label": "Team Portal Visibility",
          "text": "Public allows visitors to see schedule, roster names and stats. Private limits access to coaches and rostered players."
        }
      ]
    },
    {
      "id": "subscribe-team-subscribe-team-confirm",
      "targetSelector": "[data-tour=\"subscribe-team-confirm\"]",
      "title": "Review and confirm",
      "description": "Review the team details and any error before you continue.",
      "details": [
        {
          "label": "Total Due Monthly",
          "text": "Shows the plan's monthly price in CAD. The complimentary owner account is not charged."
        },
        {
          "label": "Continue to Secure Checkout",
          "text": "When subscriptions are open, this takes you to Stripe to pay. You come back here and the team portal is created once Stripe confirms payment. The owner account sees Create Team · Complimentary instead, and no card is charged."
        }
      ]
    }
  ]
};

export const LEAGUE_SUBSCRIPTION_WALKTHROUGH: ToolWalkthrough = {
  "id": "subscribe-league",
  "toolName": "League setup",
  "subtitle": "Preview setup for the selected subscription. Review the name, branding and monthly total before confirming.",
  "steps": [
    {
      "id": "subscribe-league-overview",
      "targetSelector": "",
      "title": "Welcome to League setup",
      "description": "Preview setup for the selected subscription. Review the name, branding and monthly total before confirming."
    },
    {
      "id": "subscribe-league-subscribe-league-identity",
      "targetSelector": "[data-tour=\"subscribe-league-identity\"]",
      "title": "Name and capacity",
      "description": "Enter the details shown on the new portal.",
      "details": [
        {
          "label": "League Name",
          "text": "Names the portal."
        },
        {
          "label": "Shortcode",
          "text": "Adds a short abbreviation used throughout the portal."
        },
        {
          "label": "Team Capacity",
          "text": "Sets a capacity from 4 to 64 teams and updates the monthly total."
        },
        {
          "label": "Close",
          "text": "Closes setup without submitting it."
        }
      ]
    },
    {
      "id": "subscribe-league-subscribe-league-logo",
      "targetSelector": "[data-tour=\"subscribe-league-logo\"]",
      "title": "Choose a logo",
      "description": "Use an image link or an image from your device.",
      "details": [
        {
          "label": "League Logo (Optional)",
          "text": "Previews the selected logo."
        },
        {
          "label": "Paste image URL or upload below...",
          "text": "Uses an image address for the logo."
        },
        {
          "label": "Upload File",
          "text": "Chooses an image file on this device."
        },
        {
          "label": "Reset to FlagOS Logo",
          "text": "Removes your logo choice and restores the default."
        }
      ]
    },
    {
      "id": "subscribe-league-subscribe-league-colors",
      "targetSelector": "[data-tour=\"subscribe-league-colors\"]",
      "title": "Choose portal colors",
      "description": "Preview the colors before creating the portal.",
      "details": [
        {
          "label": "Primary Color",
          "text": "Choose a preset swatch or use the custom color picker."
        },
        {
          "label": "Secondary Color",
          "text": "Choose the accent color from swatches or the custom picker."
        },
        {
          "label": "Tertiary Color",
          "text": "Choose the third color from swatches or the custom picker."
        },
        {
          "label": "Preview",
          "text": "Shows your color combination."
        }
      ]
    },
    {
      "id": "subscribe-league-subscribe-league-confirm",
      "targetSelector": "[data-tour=\"subscribe-league-confirm\"]",
      "title": "Review and confirm",
      "description": "Review the league details, team count and any error before you continue.",
      "details": [
        {
          "label": "Total Due Monthly",
          "text": "Shows the base plan plus team slots in CAD. The complimentary owner account is not charged."
        },
        {
          "label": "Continue to Secure Checkout",
          "text": "When subscriptions are open, this takes you to Stripe to pay for the base plan and team slots. You come back here and the league is created once Stripe confirms payment. The owner account sees Create League · Complimentary instead, and no card is charged."
        }
      ]
    }
  ]
};

export const DEVELOPMENT_NOTICE_WALKTHROUGH: ToolWalkthrough = {
  "id": "pricing-development",
  "toolName": "Development notice",
  "subtitle": "FlagOS is still in development. This notice explains why public subscription checkout is not yet available.",
  "steps": [
    {
      "id": "pricing-development-overview",
      "targetSelector": "",
      "title": "Welcome to Development notice",
      "description": "FlagOS is still in development. This notice explains why public subscription checkout is not yet available."
    },
    {
      "id": "pricing-development-pricing-development",
      "targetSelector": "[data-tour=\"pricing-development\"]",
      "title": "Return to pricing",
      "description": "No purchase is made by opening this notice.",
      "details": [
        {
          "label": "Close development notice",
          "text": "Dismisses the notice."
        },
        {
          "label": "Explore demo league",
          "text": "Opens the example league without making a purchase."
        },
        {
          "label": "Maybe later",
          "text": "Closes the notice and returns to the plan comparison."
        }
      ]
    }
  ]
};

export const LEAGUE_DIRECTORY_WALKTHROUGH: ToolWalkthrough = {
  "id": "league-directory",
  "toolName": "League Directory",
  "subtitle": "Players and coaches can find public flag football leagues, compare options and contact commissioners.",
  "steps": [
    {
      "id": "league-directory-overview",
      "targetSelector": "",
      "title": "Welcome to League Directory",
      "description": "Players and coaches can find public flag football leagues, compare options and contact commissioners."
    },
    {
      "id": "league-directory-directory-categories",
      "targetSelector": "[data-tour=\"directory-categories\"]",
      "title": "All leagues or yours",
      "description": "Choose which leagues to browse.",
      "details": [
        {
          "label": "All Leagues",
          "text": "Shows all publicly listed leagues."
        },
        {
          "label": "My Leagues",
          "text": "Shows leagues associated with your account."
        }
      ]
    },
    {
      "id": "league-directory-directory-search",
      "targetSelector": "[data-tour=\"directory-search\"]",
      "title": "Search and distance",
      "description": "Find a city, venue, postal code or league title.",
      "details": [
        {
          "label": "Search",
          "text": "Type a place or league name to narrow the results."
        },
        {
          "label": "Clear search (×)",
          "text": "Removes your search text."
        },
        {
          "label": "Use My Location",
          "text": "Asks your browser for your location to find nearby leagues."
        },
        {
          "label": "Radius",
          "text": "Chooses the maximum distance, or Any Distance."
        },
        {
          "label": "Sort",
          "text": "Orders by Closest First, League Name or Lowest Fee."
        }
      ]
    },
    {
      "id": "league-directory-directory-filters",
      "targetSelector": "[data-tour=\"directory-filters\"]",
      "title": "Narrow your choices",
      "description": "Combine filters to find the right style of football.",
      "details": [
        {
          "label": "Format",
          "text": "Opens the ruleset choices; select more than one if needed."
        },
        {
          "label": "Division",
          "text": "Chooses All Divisions, women’s, co-ed, men’s or youth football."
        },
        {
          "label": "Tier",
          "text": "Chooses the competition level."
        },
        {
          "label": "Day",
          "text": "Chooses a preferred game day."
        },
        {
          "label": "Reset All",
          "text": "Clears active filters and restores the search defaults."
        }
      ]
    },
    {
      "id": "league-directory-directory-format-options",
      "targetSelector": "[data-tour=\"directory-format-options\"]",
      "title": "Ruleset choices",
      "description": "Open Format to see these ruleset choices. Choose as many formats as you want.",
      "details": [
        {
          "label": "All",
          "text": "Selects every listed format."
        },
        {
          "label": "Clear",
          "text": "Clears the selected formats."
        },
        {
          "label": "4v4, 5v5, 6v6, 7v7, 8v8",
          "text": "Select a ruleset to include it; select it again to remove it."
        }
      ]
    },
    {
      "id": "league-directory-directory-view",
      "targetSelector": "[data-tour=\"directory-view\"]",
      "title": "Choose a results layout",
      "description": "All three layouts use the same search and filters.",
      "details": [
        {
          "label": "Cards",
          "text": "Shows full league summaries and action buttons."
        },
        {
          "label": "Venues",
          "text": "Groups leagues by where they play."
        },
        {
          "label": "Compare",
          "text": "Shows league information side by side in a table."
        }
      ]
    },
    {
      "id": "league-directory-directory-results",
      "targetSelector": "[data-tour=\"directory-results\"]",
      "title": "Read the results",
      "description": "Check fees, locations, divisions and registration details before joining.",
      "details": [
        {
          "label": "Explore Hub",
          "text": "Opens the league’s public portal."
        },
        {
          "label": "Register",
          "text": "Opens registration for that league."
        },
        {
          "label": "Inquire",
          "text": "Opens a message form for the commissioner."
        },
        {
          "label": "Reset Filters & Expand Radius",
          "text": "Clears the filters when no results match."
        }
      ]
    },
    {
      "id": "league-directory-directory-list",
      "targetSelector": "[data-tour=\"directory-list\"]",
      "title": "Run a league of your own",
      "description": "Commissioners can compare the options for listing a league.",
      "details": [
        {
          "label": "Create Your League",
          "text": "Opens the subscription comparison and league setup options."
        }
      ]
    }
  ]
};

export const LEAGUE_INQUIRY_WALKTHROUGH: ToolWalkthrough = {
  "id": "league-inquiry",
  "toolName": "Commissioner inquiry",
  "subtitle": "Ask the selected league about openings, registration, rules or game times.",
  "steps": [
    {
      "id": "league-inquiry-overview",
      "targetSelector": "",
      "title": "Welcome to Commissioner inquiry",
      "description": "Ask the selected league about openings, registration, rules or game times."
    },
    {
      "id": "league-inquiry-directory-inquiry",
      "targetSelector": "[data-tour=\"directory-inquiry\"]",
      "title": "Write your inquiry",
      "description": "The message form is separate from player registration.",
      "details": [
        {
          "label": "Topic",
          "text": "Chooses the subject: free agent, full team, rules and equipment, or game times."
        },
        {
          "label": "Your Message",
          "text": "Write the details you want the commissioner to know."
        },
        {
          "label": "Send Inquiry",
          "text": "Opens your email app with the message addressed to the league organizer, or to FlagOS support if the league has not published a contact. Press send in your email app to deliver it. This does not register you as a player."
        },
        {
          "label": "Cancel",
          "text": "Closes the form without sending."
        },
        {
          "label": "Close (×)",
          "text": "Dismisses the inquiry."
        }
      ]
    }
  ]
};

export const LOGIN_WALKTHROUGH: ToolWalkthrough = {
  "id": "account-login",
  "toolName": "Sign In",
  "subtitle": "Players, coaches and commissioners sign in here with email or Google. Your access depends on your account’s league and team roles.",
  "steps": [
    {
      "id": "account-login-overview",
      "targetSelector": "",
      "title": "Welcome to Sign In",
      "description": "Players, coaches and commissioners sign in here with email or Google. Your access depends on your account’s league and team roles."
    },
    {
      "id": "account-login-login-back",
      "targetSelector": "[data-tour=\"login-back\"]",
      "title": "Return home",
      "description": "You can explore FlagOS without signing in.",
      "details": [
        {
          "label": "Back to FlagOS",
          "text": "Returns to the home page."
        },
        {
          "label": "Guide",
          "text": "Reopens this sign-in guide.",
          "targetSelector": "[data-testid=\"page-guide-button\"]"
        }
      ]
    },
    {
      "id": "account-login-login-local-email",
      "targetSelector": "[data-tour=\"login-local-email\"]",
      "title": "Local email preview",
      "description": "This section appears only on a local development address. It is not normal account sign-in.",
      "details": [
        {
          "label": "e.g. athlete@flagos.ca",
          "text": "Enter an email from the local player or coach roster."
        },
        {
          "label": "Sign In",
          "text": "Previews that roster role locally."
        }
      ]
    },
    {
      "id": "account-login-login-email",
      "targetSelector": "[data-tour=\"login-email\"]",
      "title": "Email and password",
      "description": "Sign in or create an account in the same form.",
      "details": [
        {
          "label": "Name (optional)",
          "text": "Adds your display name when creating an account."
        },
        {
          "label": "you@example.com",
          "text": "Enter your sign-in email."
        },
        {
          "label": "Password",
          "text": "Enter your password; a new account needs at least six characters."
        },
        {
          "label": "Forgot or set password?",
          "text": "Sends a reset link to the email entered above. Google users can also use it to add a password."
        },
        {
          "label": "Sign in with email",
          "text": "Signs in and continues to the requested page."
        },
        {
          "label": "Create an account",
          "text": "Switches to the account creation form."
        },
        {
          "label": "Create account",
          "text": "Creates the account; follow the verification message before signing in."
        },
        {
          "label": "Sign in",
          "text": "Switches back from account creation to sign-in."
        }
      ]
    },
    {
      "id": "account-login-login-google",
      "targetSelector": "[data-tour=\"login-google\"]",
      "title": "Sign in with Google",
      "description": "Use the Google account connected to your league or team.",
      "details": [
        {
          "label": "SIGN IN WITH GOOGLE",
          "text": "Starts Google sign-in and continues to your destination when successful."
        }
      ]
    },
    {
      "id": "account-login-login-session",
      "targetSelector": "[data-tour=\"login-session\"]",
      "title": "Already signed in",
      "description": "Your current account and available next steps appear here.",
      "details": [
        {
          "label": "Manage connected emails",
          "text": "Opens verified sign-in email settings."
        },
        {
          "label": "CONTINUE TO LEAGUE PORTAL",
          "text": "Continues to your requested page or the league portal."
        },
        {
          "label": "Sign Out Account",
          "text": "Signs out of the current account."
        },
        {
          "label": "Explore league options",
          "text": "Opens pricing if no league role is assigned yet."
        },
        {
          "label": "Switch Account / Sign In Again",
          "text": "Signs out and starts Google sign-in again."
        },
        {
          "label": "Sign Out",
          "text": "Signs out so another account can sign in."
        }
      ]
    },
    {
      "id": "account-login-login-local-roles",
      "targetSelector": "[data-tour=\"login-local-roles\"]",
      "title": "Local role previews",
      "description": "These development-only buttons let you inspect different views without changing real account permissions.",
      "details": [
        {
          "label": "League Admin",
          "text": "Previews the commissioner view."
        },
        {
          "label": "Team Admin",
          "text": "Choose a team in the dropdown."
        },
        {
          "label": "Apply & Go",
          "text": "Opens the selected team as a local coach preview."
        },
        {
          "label": "Rostered Player",
          "text": "Choose an athlete in the dropdown."
        },
        {
          "label": "Sign In As Player",
          "text": "Opens the selected player’s local profile preview."
        },
        {
          "label": "Spectator (Default View)",
          "text": "Returns to the public visitor view."
        }
      ]
    }
  ]
};

export const JOIN_LEAGUE_WALKTHROUGH: ToolWalkthrough = {
  "id": "player-registration",
  "toolName": "Player Registration",
  "subtitle": "New players can register as free agents for the active league, choose positions and request teammates.",
  "steps": [
    {
      "id": "player-registration-overview",
      "targetSelector": "",
      "title": "Welcome to Player Registration",
      "description": "New players can register as free agents for the active league, choose positions and request teammates."
    },
    {
      "id": "player-registration-join-status",
      "targetSelector": "[data-tour=\"join-status\"]",
      "title": "Check whether you can register",
      "description": "Existing roles or closed registration may replace the form with a notice.",
      "details": [
        {
          "label": "View Player Profile",
          "text": "Opens your existing player profile."
        },
        {
          "label": "Go to My Team",
          "text": "Opens the team you manage."
        },
        {
          "label": "Browse Teams",
          "text": "Browses teams when a new registration is not needed."
        },
        {
          "label": "Browse Active Teams",
          "text": "Browses the league's teams while registration is closed."
        }
      ]
    },
    {
      "id": "player-registration-join-identity",
      "targetSelector": "[data-tour=\"join-identity\"]",
      "title": "Your player details",
      "description": "Use your real name and a contact email so the league can identify you.",
      "details": [
        {
          "label": "Full Name *",
          "text": "Required: the name shown on your player record."
        },
        {
          "label": "Email Address *",
          "text": "Required: use the email that identifies you on the roster and player profile."
        },
        {
          "label": "Experience Level",
          "text": "Choose Beginner, Intermediate, Advanced or Veteran Competitor."
        }
      ]
    },
    {
      "id": "player-registration-join-positions",
      "targetSelector": "[data-tour=\"join-positions\"]",
      "title": "Preferred positions",
      "description": "Select all the positions you would like to play.",
      "details": [
        {
          "label": "QB, WR, RB, C",
          "text": "Toggle quarterback, receiver, running back and center."
        },
        {
          "label": "DB, RUSH, LB, ATH",
          "text": "Toggle defensive back, rusher, linebacker and athlete."
        }
      ],
      "tip": "If you leave every position unselected, your registration uses ATH (athlete)."
    },
    {
      "id": "player-registration-join-teammates",
      "targetSelector": "[data-tour=\"join-teammates\"]",
      "title": "Request teammates",
      "description": "Search the existing roster and choose up to five people you would like to play with.",
      "details": [
        {
          "label": "Search for players...",
          "text": "Filters existing players by name."
        },
        {
          "label": "Player name",
          "text": "Adds or removes that player from your requests.",
          "targetSelector": "button"
        },
        {
          "label": "Selected teammate",
          "text": "Select a chosen name again to remove the request."
        }
      ],
      "tip": "Teammate requests are preferences, not a guaranteed team assignment."
    },
    {
      "id": "player-registration-join-submit",
      "targetSelector": "[data-tour=\"join-submit\"]",
      "title": "Finish registration",
      "description": "Registration adds you to the free-agent pool; it does not automatically place you on a team.",
      "details": [
        {
          "label": "Submit Registration",
          "text": "Submits your player details and opens the teams page. Wait for the button to finish before trying again."
        }
      ]
    }
  ]
};

export const ACCOUNT_WALKTHROUGH: ToolWalkthrough = {
  "id": "connected-emails",
  "toolName": "Account & Connected Emails",
  "subtitle": "Use one FlagOS account with up to ten verified sign-in emails. Connecting an email does not import another account’s records or roles.",
  "steps": [
    {
      "id": "connected-emails-overview",
      "targetSelector": "",
      "title": "Welcome to Account & Connected Emails",
      "description": "Use one FlagOS account with up to ten verified sign-in emails. Connecting an email does not import another account’s records or roles."
    },
    {
      "id": "connected-emails-account-intro",
      "targetSelector": "[data-tour=\"account-intro\"]",
      "title": "Before connecting an email",
      "description": "You need to sign in and verify your primary email first.",
      "details": [
        {
          "label": "Back to sign-in settings",
          "text": "Returns to the sign-in page."
        },
        {
          "label": "Sign in to manage connected emails",
          "text": "Opens sign-in and returns here afterward."
        }
      ]
    },
    {
      "id": "connected-emails-account-emails",
      "targetSelector": "[data-tour=\"account-emails\"]",
      "title": "Connected sign-in emails",
      "description": "Review the addresses that can sign in to this account.",
      "details": [
        {
          "label": "Primary account",
          "text": "Identifies your main account email; it cannot be disconnected here."
        },
        {
          "label": "Disconnect",
          "text": "After confirming ownership, removes an additional email and signs you out. Read the confirmation before proceeding."
        }
      ],
      "tip": "Disconnecting signs you out. Read the confirmation before removing an address."
    },
    {
      "id": "connected-emails-account-confirm",
      "targetSelector": "[data-tour=\"account-confirm\"]",
      "title": "Confirm the primary account",
      "description": "For your protection, sign in again before adding or removing an address.",
      "details": [
        {
          "label": "Primary account password",
          "text": "Enter the password of the primary account shown above."
        },
        {
          "label": "Confirm with password",
          "text": "Verifies your account and opens the additional-email form."
        },
        {
          "label": "Confirm with Google instead",
          "text": "Confirms ownership through Google sign-in."
        }
      ]
    },
    {
      "id": "connected-emails-account-connect",
      "targetSelector": "[data-tour=\"account-connect\"]",
      "title": "Add an existing verified email",
      "description": "Sign in to the additional account without switching your current session.",
      "details": [
        {
          "label": "Additional email",
          "text": "Enter the existing verified account’s email."
        },
        {
          "label": "Additional account password",
          "text": "Enter that account’s password."
        },
        {
          "label": "Connect email",
          "text": "Adds the verified email to this account."
        },
        {
          "label": "Connect another Google account",
          "text": "Connects an additional verified Google account instead."
        },
        {
          "label": "Confirm primary account again",
          "text": "Returns to the ownership confirmation step."
        }
      ]
    }
  ]
};

export const PROFILE_WALKTHROUGH: ToolWalkthrough = {
  "id": "player-profile",
  "toolName": "Player Profile",
  "subtitle": "Players can review their stats, team links, display settings and account details. Coaches and commissioners may also inspect player profiles.",
  "steps": [
    {
      "id": "player-profile-overview",
      "targetSelector": "",
      "title": "Welcome to Player Profile",
      "description": "Players can review their stats, team links, display settings and account details. Coaches and commissioners may also inspect player profiles."
    },
    {
      "id": "player-profile-profile-switch",
      "targetSelector": "[data-tour=\"profile-switch\"]",
      "title": "Choose a profile",
      "description": "Extra viewing controls appear for staff and preview roles.",
      "details": [
        {
          "label": "Home / Back to team",
          "text": "Returns to the home page or this player's team."
        }
      ]
    },
    {
      "id": "player-profile-selector",
      "targetSelector": "[data-tour=\"profile-player-selector\"]",
      "title": "Inspect another player",
      "description": "This selector is available for staff and local preview roles.",
      "details": [
        {
          "label": "Player selector",
          "text": "Chooses the player whose profile and statistics you want to inspect."
        }
      ]
    },
    {
      "id": "player-profile-profile-identity",
      "targetSelector": "[data-tour=\"profile-identity\"]",
      "title": "Player and team",
      "description": "Check the athlete’s name, jersey, positions and attached roster emails.",
      "details": [
        {
          "label": "Team name",
          "text": "Opens the player’s team."
        },
        {
          "label": "Study Team Playbook",
          "text": "Opens the team playbook when available."
        },
        {
          "label": "Team Portal",
          "text": "Opens the team’s main page."
        },
        {
          "label": "Settings",
          "text": "Opens the league appearance customizer; available changes depend on your role."
        }
      ]
    },
    {
      "id": "player-profile-profile-tabs",
      "targetSelector": "[data-tour=\"profile-tabs\"]",
      "title": "Choose a section",
      "description": "Each tab changes the content below without leaving this profile.",
      "details": [
        {
          "label": "Player Statistics",
          "text": "Shows season totals and performance summaries."
        },
        {
          "label": "Appearance",
          "text": "Opens this device’s display preferences."
        },
        {
          "label": "Official Rules (View Only)",
          "text": "Shows the league’s rules without editing them."
        },
        {
          "label": "Account & Linked Emails",
          "text": "Shows athlete account details and sign-in email settings."
        }
      ]
    },
    {
      "id": "player-profile-profile-stats",
      "targetSelector": "[data-tour=\"profile-stats\"]",
      "title": "Player statistics",
      "description": "Read game totals, scoring, passing, receiving, rushing and defensive performance.",
      "details": [
        {
          "label": "Games Played",
          "text": "Counts recorded official games."
        },
        {
          "label": "Total Touchdowns",
          "text": "Adds passing, receiving and rushing touchdowns."
        },
        {
          "label": "Passing TDs",
          "text": "Shows touchdown passes and completions against attempts."
        },
        {
          "label": "Receptions",
          "text": "Shows catches and receiving touchdowns."
        },
        {
          "label": "Rushing TDs",
          "text": "Shows rushing scores and carries."
        },
        {
          "label": "Flags / Def",
          "text": "Shows flag pulls, interceptions and sacks."
        }
      ]
    },
    {
      "id": "player-profile-passing",
      "targetSelector": "[data-tour=\"profile-passing\"]",
      "title": "Passing Performance",
      "description": "Quarterback totals from recorded games.",
      "details": [
        {
          "label": "Pass Completions / Pass Attempts",
          "text": "Shows successful passes and total attempts."
        },
        {
          "label": "Completion Percentage",
          "text": "Shows the share of passes completed."
        },
        {
          "label": "Touchdown Passes",
          "text": "Counts passing scores."
        }
      ]
    },
    {
      "id": "player-profile-receiving",
      "targetSelector": "[data-tour=\"profile-receiving\"]",
      "title": "Receiving & Rushing",
      "description": "Review this player's offensive contributions.",
      "details": [
        {
          "label": "Total Receptions / Receiving Touchdowns",
          "text": "Shows catches and receiving scores."
        },
        {
          "label": "Rush Attempts / Rushing Touchdowns",
          "text": "Shows carries and rushing scores."
        }
      ]
    },
    {
      "id": "player-profile-defense",
      "targetSelector": "[data-tour=\"profile-defense\"]",
      "title": "Defensive Impact",
      "description": "Review recorded defensive stops.",
      "details": [
        {
          "label": "Flags (Tackles)",
          "text": "Counts flag pulls."
        },
        {
          "label": "QB Sacks",
          "text": "Counts sacks of the quarterback."
        },
        {
          "label": "Interceptions (INT)",
          "text": "Counts intercepted passes."
        },
        {
          "label": "Pass Breakups (PBU)",
          "text": "Counts passes defended."
        }
      ]
    },
    {
      "id": "player-profile-career",
      "targetSelector": "[data-tour=\"profile-career\"]",
      "title": "Career history",
      "description": "Appears once the league has finished at least one season. The cards above show the current season; this table shows every season.",
      "details": [
        {
          "label": "Season rows",
          "text": "Each season you played, with your team and key stats. A crown marks a championship season."
        },
        {
          "label": "Career total",
          "text": "Your totals across every season in this league."
        }
      ]
    },
    {
      "id": "player-profile-playbook",
      "targetSelector": "[data-tour=\"profile-playbook\"]",
      "title": "Study the team's plays",
      "description": "This shortcut appears for rostered players and eligible coaches.",
      "details": [
        {
          "label": "Open team Playbooks",
          "text": "Opens your team's playbooks to study formations, routes and wristband cards."
        }
      ]
    },
    {
      "id": "player-profile-profile-appearance",
      "targetSelector": "[data-tour=\"profile-appearance\"]",
      "title": "Display appearance",
      "description": "These choices affect this device, not the league’s branding.",
      "details": [
        {
          "label": "Light",
          "text": "Uses the light display theme."
        },
        {
          "label": "Dark",
          "text": "Uses the dark display theme."
        }
      ]
    },
    {
      "id": "player-profile-profile-rules",
      "targetSelector": "[data-tour=\"profile-rules\"]",
      "title": "Official league rules",
      "description": "Review the settings the commissioner has chosen for this league.",
      "details": [
        {
          "label": "View-only summary",
          "text": "Read game format, timing, scoring and other rules here. Changes belong in league administration, not this profile."
        }
      ]
    },
    {
      "id": "player-profile-profile-account",
      "targetSelector": "[data-tour=\"profile-account\"]",
      "title": "Account and linked emails",
      "description": "Roster email details and verified sign-in emails serve different purposes.",
      "details": [
        {
          "label": "Manage verified account sign-in emails",
          "text": "Opens Account & Connected Emails to manage verified sign-in addresses."
        },
        {
          "label": "Log Out",
          "text": "Signs out of the current account."
        }
      ]
    }
  ]
};

export const MY_STORY_WALKTHROUGH: ToolWalkthrough = {
  "id": "founder-story",
  "toolName": "My Story",
  "subtitle": "Authorized readers can learn how the founder’s football and coaching experience led to FlagOS. Chapter photos can be personalized on this device.",
  "steps": [
    {
      "id": "founder-story-overview",
      "targetSelector": "",
      "title": "Welcome to My Story",
      "description": "Authorized readers can learn how the founder’s football and coaching experience led to FlagOS. Chapter photos can be personalized on this device."
    },
    {
      "id": "founder-story-story-private",
      "targetSelector": "[data-tour=\"story-private\"]",
      "title": "Private founder story",
      "description": "This page is restricted to the founder and authorized administrators.",
      "details": [
        {
          "label": "Back to FlagOS",
          "text": "Returns to the public home page."
        },
        {
          "label": "Guide",
          "text": "Explains the story page and its available controls.",
          "targetSelector": "[data-testid=\"page-guide-button\"]"
        }
      ]
    },
    {
      "id": "founder-story-story-header",
      "targetSelector": "[data-tour=\"story-header\"]",
      "title": "Reading controls",
      "description": "Return home, share the page or adjust its appearance.",
      "details": [
        {
          "label": "Back to FlagOS",
          "text": "Returns to the home page."
        },
        {
          "label": "FlagOS",
          "text": "The logo also returns home."
        },
        {
          "label": "Copy link to story",
          "text": "Copies this page’s address."
        },
        {
          "label": "Guide",
          "text": "Reopens this reading guide.",
          "targetSelector": "[data-testid=\"page-guide-button\"]"
        },
        {
          "label": "Theme toggle",
          "text": "Changes this device’s light or dark theme."
        },
        {
          "label": "Account menu",
          "text": "Opens your account options."
        }
      ]
    },
    {
      "id": "founder-story-story-contents",
      "targetSelector": "[data-tour=\"story-contents\"]",
      "title": "Jump to a chapter",
      "description": "The contents list follows your progress through the story.",
      "details": [
        {
          "label": "Chapter title",
          "text": "Jumps to that chapter without leaving the page."
        },
        {
          "label": "Chapter quick jump bar",
          "text": "On smaller screens, scroll the chapter links sideways to choose a chapter."
        }
      ]
    },
    {
      "id": "founder-story-story-chapter",
      "targetSelector": "[data-tour=\"story-chapter\"]",
      "title": "Read the story",
      "description": "Each chapter has text and a photo or a suggested photo.",
      "details": [
        {
          "label": "Change Photo",
          "text": "Opens the chapter’s photo editor."
        },
        {
          "label": "Remove",
          "text": "Removes a saved chapter photo from this device."
        },
        {
          "label": "Edit",
          "text": "Opens the photo editor from a photo suggestion."
        }
      ]
    },
    {
      "id": "founder-story-story-author",
      "targetSelector": "[data-tour=\"story-author\"]",
      "title": "Continue to the team tools",
      "description": "The author section connects the story to the coaching workspace.",
      "details": [
        {
          "label": "York Schedule",
          "text": "Opens the York team schedule."
        },
        {
          "label": "Playbook Designer",
          "text": "Opens the York team playbook."
        }
      ]
    },
    {
      "id": "founder-story-story-footer",
      "targetSelector": "[data-tour=\"story-footer\"]",
      "title": "Back to the main site",
      "description": "You can return to FlagOS after reading.",
      "details": [
        {
          "label": "Back to FlagOS",
          "text": "Returns to the home page."
        }
      ]
    }
  ]
};

export const STORY_PHOTO_WALKTHROUGH: ToolWalkthrough = {
  "id": "story-photo",
  "toolName": "Chapter Photo",
  "subtitle": "Add a picture and caption to the selected story chapter. Saved photos stay in this browser on this device.",
  "steps": [
    {
      "id": "story-photo-overview",
      "targetSelector": "",
      "title": "Welcome to Chapter Photo",
      "description": "Add a picture and caption to the selected story chapter. Saved photos stay in this browser on this device."
    },
    {
      "id": "story-photo-story-photo-editor",
      "targetSelector": "[data-tour=\"story-photo-editor\"]",
      "title": "Add or replace a photo",
      "description": "Choose a device image or paste an image link, then review the preview.",
      "details": [
        {
          "label": "Close (×)",
          "text": "Closes the editor without saving."
        },
        {
          "label": "Choose image file (PNG, JPG, WebP)",
          "text": "Selects an image file from this device."
        },
        {
          "label": "Paste Image URL",
          "text": "Paste a full image address instead of uploading."
        },
        {
          "label": "Caption / Credit (Optional)",
          "text": "Adds a short description under the photo."
        },
        {
          "label": "Remove Photo",
          "text": "Removes the saved photo for this chapter."
        },
        {
          "label": "Cancel",
          "text": "Closes the editor without saving your changes."
        },
        {
          "label": "Save Photo",
          "text": "Saves the image and caption for this browser."
        }
      ]
    }
  ]
};

export const SIGNED_IN_HOME_WALKTHROUGH: ToolWalkthrough = {
  "id": "signed-in-home",
  "toolName": "Your Home",
  "subtitle": "Your leagues, teams and upcoming games are gathered here after sign-in. Cards show your role in each place.",
  "steps": [
    {
      "id": "signed-in-home-overview",
      "targetSelector": "",
      "title": "Welcome to Your Home",
      "description": "Your leagues, teams and upcoming games are gathered here after sign-in. Cards show your role in each place."
    },
    {
      "id": "signed-in-home-home-welcome",
      "targetSelector": "[data-tour=\"home-welcome\"]",
      "title": "Welcome back",
      "description": "Use the shortcuts beside your welcome message.",
      "details": [
        {
          "label": "Platform Admin",
          "text": "Opens platform management for authorized administrators."
        },
        {
          "label": "League Directory",
          "text": "Browses public leagues."
        }
      ]
    },
    {
      "id": "signed-in-home-home-next",
      "targetSelector": "[data-tour=\"home-next\"]",
      "title": "Up next",
      "description": "Your next games appear here when available.",
      "details": [
        {
          "label": "Watch",
          "text": "Opens live game coverage."
        },
        {
          "label": "Open stat keeper",
          "text": "Opens live scoring for an independent team you coach."
        },
        {
          "label": "Resume stat keeper",
          "text": "Resumes a paused independent-team game."
        },
        {
          "label": "Details",
          "text": "Opens the game details."
        }
      ]
    },
    {
      "id": "signed-in-home-home-memberships",
      "targetSelector": "[data-tour=\"home-memberships\"]",
      "title": "Your leagues and teams",
      "description": "Open the league or team you want to work with.",
      "details": [
        {
          "label": "Open League / League Home",
          "text": "Opens the league management dashboard for commissioners, or its public home for other members."
        },
        {
          "label": "Team name / Team hub",
          "text": "Opens that team's page."
        },
        {
          "label": "Schedule",
          "text": "Opens the team's games."
        },
        {
          "label": "Playbook",
          "text": "Opens the team's plays."
        },
        {
          "label": "Manage Roster / Roster",
          "text": "Opens roster management for coaches, or the roster for other members."
        },
        {
          "label": "My Stats / Stats",
          "text": "Shows your player profile or the team's statistics."
        },
        {
          "label": "Last game score",
          "text": "Opens the latest game's details."
        }
      ]
    },
    {
      "id": "signed-in-home-home-membership-help",
      "targetSelector": "[data-tour=\"home-memberships\"]",
      "title": "Missing a league or team?",
      "description": "An invitation may use a different address from the one you signed in with.",
      "details": [
        {
          "label": "Try again",
          "text": "Retries loading memberships after a connection error."
        },
        {
          "label": "connect it to your account",
          "text": "Opens connected-email settings if your invitation used another address."
        }
      ]
    },
    {
      "id": "signed-in-home-home-start",
      "targetSelector": "[data-tour=\"home-start\"]",
      "title": "Start something new",
      "description": "Find a new league or compare tools for your own team or league.",
      "details": [
        {
          "label": "Create a league",
          "text": "Opens pricing and league subscription options."
        },
        {
          "label": "Start a team",
          "text": "Opens pricing for an independent team."
        },
        {
          "label": "Find a league",
          "text": "Opens the public directory."
        },
        {
          "label": "Explore the demo league",
          "text": "Opens the example league for a hands-on look."
        }
      ]
    }
  ]
};

export const FREE_AGENTS_WALKTHROUGH: ToolWalkthrough = {
  "id": "free-agents",
  "toolName": "Find a Team",
  "subtitle": "For players without a team: join a public league that accepts free agents, or leave your details so organizers can reach you.",
  "steps": [
    {
      "id": "free-agents-overview",
      "targetSelector": "",
      "title": "Welcome to Find a Team",
      "description": "A free agent is a player who registers without a team. The league organizer places free agents on teams that need players."
    },
    {
      "id": "free-agents-leagues",
      "targetSelector": "[data-tour=\"free-agent-leagues\"]",
      "title": "Leagues accepting free agents",
      "description": "Only public leagues whose organizers chose to be listed and to accept free agents appear here.",
      "details": [
        { "label": "Register as Free Agent", "text": "Opens that league's player registration form. The organizer reviews it and assigns you to a team." },
        { "label": "League Page", "text": "Opens the league's public page with standings, schedule and contact details." }
      ]
    },
    {
      "id": "free-agents-interest",
      "targetSelector": "[data-tour=\"free-agent-interest\"]",
      "title": "Leave your details",
      "description": "If no league near you is listed, send your name, email and area. FlagOS shares it with organizers in your area; it is never shown publicly.",
      "details": [
        { "label": "Name, Email, City / Area", "text": "Required so an organizer can contact you." },
        { "label": "Experience and Notes", "text": "Optional. Positions you like, availability, or anything else organizers should know." },
        { "label": "Age confirmation", "text": "Players under 18 need a parent or guardian's permission to submit.", "targetSelector": "label:has(input[type=\"checkbox\"])" },
        { "label": "Send My Details", "text": "Saves your details and shows a confirmation." }
      ]
    },
    {
      "id": "free-agents-next",
      "targetSelector": "",
      "title": "What happens next",
      "description": "After you register with a league, its organizer adds you to a team. Sign in with the email you registered with to see your team, schedule and stats. If you left your details instead, an organizer near you may reach out by email.",
      "details": [
        { "label": "Browse leagues", "text": "The League Directory lists every public league, including ones not taking free agents right now." }
      ]
    }
  ]
};
