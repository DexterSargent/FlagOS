# FlagOS Stripe setup walkthrough

## Starting point: 26 October 2026

Already done:

- Stripe SDK, Checkout, webhook handler, billing portal and seat-change code deployed.
- Stripe skills installed and the MCP URL configured in [mcp.json](../.vscode/mcp.json).
- Live `GET https://flagos.ca/api/billing/status` returns `{"enabled":false}`.
- Stripe Dashboard sign-in completed by the owner. The assistant switched into the
  existing **FLAGOS sandbox**, account `acct_1UUopeRk6enkly19`, and configured the
  products and portal below. This is a separate account from live FLAGOS.
- No Stripe MCP tools, including `stripe_implementation_planner`, are exposed to this
  chat even after the owner authorized MCP. Dashboard access works independently.
- Google Cloud Secret Manager checked by resource name only: no `STRIPE_*` secrets exist.
  No secret values were accessed.
- Firebase secret command options verified against the locally cached CLI.

**Live money collection is NOT enabled.** No keys were created or revealed, and no
webhook destination was created. No purchases were attempted. Your complimentary
teams and leagues are unchanged.

### Sandbox configuration completed

| Application setting | Sandbox product | Monthly CAD price | Price ID |
| --- | --- | --- | --- |
| `STRIPE_PRICE_TEAM` | Existing Team Plan (reused) | 40.00 | `price_1UUq4JRk6enkly19DthpitXV` |
| `STRIPE_PRICE_LEAGUE_BASE` | FlagOS League Base (created) | 40.00 | `price_1UUr3XRk6enkly197DlMFx3x` |
| `STRIPE_PRICE_LEAGUE_SEAT` | FlagOS League Team Slot (created) | 20.00 per slot | `price_1UUr3zRk6enkly19pjNuTg3R` |

Product IDs: Team `prod_VVrnCebbc0qyml`, League Base `prod_VVspF0rVuHA8j7`,
Team Slot `prod_VVsp65tVMOgjPK`. These IDs are non-secret and **sandbox-only**.
Do not recreate these products or use these prices in live configuration.

The sandbox default Customer Portal configuration was saved, then reloaded and
checked for persistence:

- Invoice history: enabled.
- Payment-method updates: enabled.
- Cancellation: enabled, at the end of the billing period.
- Plan switching: disabled.
- Quantity changes: disabled.

### Remaining immediate steps (do these next)

1. Leave the Dashboard in **FLAGOS sandbox**, not live FLAGOS or shared Test mode.
2. Create the restricted **sandbox** key described in step 6. Do not paste it into chat.
   Store it securely under a clearly separate name, such as
   `FLAGOS_SANDBOX_STRIPE_SECRET_KEY` in Google Secret Manager, without granting the
   production backend access or adding it to production YAML. Secret Manager can be
   opened from the Google Cloud Console and the value entered directly in its form.
3. Tell the assistant the secret resource name only. It can retrieve the value directly
   into a local process without printing it; never use a tool command that outputs it.
4. Install/authenticate the Stripe CLI locally for signed webhook forwarding. The CLI
   is not currently available on PATH. Use Stripe's official CLI installation guide,
   then `stripe login`, confirming the sandbox account, not live FLAGOS.
5. In one terminal, start the isolated Firebase services:

   ```powershell
   npx --offline firebase-tools@13.35.1 emulators:start --only auth,firestore --project demo-flagos-local
   ```

   Auth port 9099 and Firestore port 8080 were not listening when checked. The
   existing app on port 3001 is not evidence that these services are running.
6. In another terminal, forward sandbox events:

   ```powershell
   stripe listen --forward-to http://localhost:3001/api/webhooks/stripe
   ```

   Confirm the CLI is using the intended sandbox before starting. The CLI displays
   a signing secret: store that securely as a separate sandbox webhook secret, not in chat.
7. Have the assistant start a local development process with the sandbox secrets, the
   three sandbox price IDs above, `APP_BASE_URL=http://localhost:3001`,
   `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`,
   `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-flagos-local`, and
   `BILLING_CHECKOUT_ENABLED=true` **only in that local process**. Stop/restart only the
   identified local server process if port 3001 is already occupied; do not kill unrelated
   Node processes. Do not edit production flags.
8. Verify emulators are responsive and run step 9 with a verified non-owner test account.

Steps 1-5 below document the full setup and can now be skipped where marked complete
above. The sandbox restricted key, signed webhook forwarding and real Checkout tests
are still outstanding. Tax collection remains off.

Do not paste passwords, API keys, signing secrets, bank details or identity documents
into chat. Enter them directly in Stripe or the hidden Secret Manager CLI prompts.

## 1. Sign in and complete your business details

1. Open [Stripe Dashboard](https://dashboard.stripe.com).
2. Sign in yourself, including any Google sign-in, passkey or two-factor approval.
3. Confirm that you selected the business operating FlagOS, not another Stripe account.
4. For live activation, complete Stripe's requested legal business details, representative
   verification, payout bank account, business website and support contact.
5. Enable two-factor authentication. Do not share login credentials with the assistant.

Business verification and tax registration require your real information; the assistant
cannot truthfully fill these in for you.

## 2. Connect the assistant to Stripe

This is separate from signing into the Dashboard.

1. In VS Code, press **Ctrl+Shift+P**.
2. Run **Developer: Reload Window**.
3. Open the Command Palette again and run **MCP: List Servers**.
4. Select **stripe**, then **Start Server** (or the corresponding start action).
5. Complete Stripe's browser authorization flow and confirm the correct account.
6. Return to chat and say:

   > Check whether stripe_implementation_planner is available. If it is, run it for
   > https://flagos.ca, a Canadian flag-football administration SaaS. Phase 1 is monthly
   > CAD subscriptions: independent team $40; league $40 base plus $20 per team.
   > No trials. Preserve complimentary grants. Use Checkout, Billing and Customer Portal.
   > Registration payments and organizer payouts through Connect are deferred.
   > Subscription invoices are in scope; separate manual invoicing is deferred.
   > Tax collection must stay off until registration is confirmed.
   > Compare the existing implementation against the plan before enabling billing.

7. If the planner still is not exposed after reload and authentication, report that as a
   blocker. Do not claim a planner-generated review occurred. Ordinary Stripe API tools
   are not a substitute for this specifically requested tool.

## 3. Use a sandbox, not the live site, for the first purchases

1. Use the Stripe account/environment selector to create or open a **Sandbox**, named
   something like **FlagOS Development**.
2. Confirm the Dashboard indicates a sandbox/test environment before creating anything.
3. Keep all prices, keys, portal settings and webhook destinations in that same sandbox.
4. Use a local Firebase demo/emulator environment or a separate non-production backend
   for payment testing. Do not point sandbox checkout at the production Firestore database:
   the current billing code can create real app entities from sandbox payments.

The assistant can wire the isolated test environment once Stripe access is available.
It should not enable sandbox purchases on flagos.ca just to simplify testing.

## 4. Create the three products and monthly CAD prices

In the sandbox, open **Product catalogue** (or search the Dashboard for Products).
For each row, choose **Add product**, set recurring pricing, and save.

| Product name | Pricing | Amount | Currency | Interval |
| --- | --- | --- | --- | --- |
| FlagOS Team | Flat recurring price | 40.00 | CAD | Monthly |
| FlagOS League Base | Flat recurring price | 40.00 | CAD | Monthly |
| FlagOS League Team Slot | Per-unit recurring price | 20.00 | CAD | Monthly |

Use no free trial, introductory discount or tiered pricing.
The app supplies the quantity for League Team Slot; do not make a separate price for
every league size. A six-team league should total **CAD 160/month before tax**.

After saving each product:

1. Open its monthly price.
2. Copy its **Price ID**, starting with `price_`, not its Product ID (`prod_`).
3. Map it to the following application setting:

| Price | Setting |
| --- | --- |
| Team | `STRIPE_PRICE_TEAM` |
| League Base | `STRIPE_PRICE_LEAGUE_BASE` |
| League Team Slot | `STRIPE_PRICE_LEAGUE_SEAT` |

Price IDs are not API secrets, but the app stores this configuration alongside its
other server-only Stripe settings. Prices must be monthly and in CAD; do not substitute
an annual or USD price.

## 5. Configure the Customer Portal

In Dashboard settings, search for **Customer portal**.

1. Configure and save the **default** portal configuration. The app currently uses the
   default rather than passing a specific configuration ID.
2. Enable payment-method updates.
3. Enable invoice history/downloads.
4. Allow subscription cancellation **at the end of the billing period**, not immediately.
5. Disable subscription plan switching and quantity changes. League seat changes must
   go through FlagOS so the charge can be previewed and capacity validated.
6. Use FlagOS branding and your real support contact.
7. Do not invent legal-policy URLs. Publish and approve the policies first if Stripe asks
   for them.

The app supplies the portal return URL. A paid league opens the portal from League
Settings > Subscription > Manage billing; a paid independent team opens it from
Manage Billing on its team page. Complimentary accounts have no Stripe subscription.

## 6. Create a restricted API key

In the same sandbox, open **Developers/Workbench > API keys** and choose
**Create restricted key**. Dashboard labels may vary; use Dashboard search if needed.

Name it **FlagOS development billing**. Give only the required resource permissions:

- Write: Checkout Sessions, Customers, Subscriptions, Invoices and Customer Portal.
- Read: Prices, Charges, Payment Intents and Invoice Payments, where these are exposed
  as separate permission categories.
- Leave unrelated capabilities disabled.

Copy the restricted key (`rk_...`) directly into the secure prompt in step 8.
If testing reports a missing permission, identify that specific API call and grant its
resource permission rather than replacing this with an unrestricted key.

## 7. Create the webhook destination

In **Workbench > Webhooks** (or Dashboard search for Webhooks):

1. Choose **Add destination / Add endpoint**.
2. Select events **from this account**, not connected accounts.
3. For development, use the isolated backend's HTTPS URL followed by
   `/api/webhooks/stripe`, or a local Stripe CLI forwarding endpoint.
4. For live mode later, use exactly:
   `https://flagos.ca/api/webhooks/stripe`.
5. Use the integration's API version, **2026-09-30.endive**, where selectable. If unavailable,
   resolve that mismatch before activation; invoice/subscription payload fields are version-sensitive.
6. Select these individual events, not all events:

   ```text
   checkout.session.completed
   checkout.session.async_payment_succeeded
   checkout.session.async_payment_failed
   checkout.session.expired
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   customer.subscription.paused
   customer.subscription.resumed
   invoice.paid
   invoice.payment_failed
   charge.refunded
   charge.dispute.created
   radar.early_fraud_warning.created
   ```

7. Save the endpoint and reveal its **Signing secret**, starting with `whsec_`.
8. Store it securely as `STRIPE_WEBHOOK_SECRET`. A CLI forwarding secret and a Dashboard
   destination secret are different; use the one that signs the deliveries reaching that server.

Webhooks are required. Until server configuration is in place, signed deliveries can
fail; configure secrets, redeploy, and resend failed deliveries before testing completion.

## 8. Store live credentials securely when ready

For local development, use local-only server environment settings with sandbox values.
Never commit them. The commands below target **production**; run them only for live
credentials after the isolated tests pass. Do not put sandbox keys into this project.

Open a PowerShell terminal in the repository:

```powershell
Set-Location 'C:\Users\dexte\OneDrive\Documents\FlagLeagueApp\yuwffl-app'
npx -y firebase-tools@latest apphosting:secrets:set STRIPE_SECRET_KEY --project flagfootballleaguemachine
npx -y firebase-tools@latest apphosting:secrets:set STRIPE_WEBHOOK_SECRET --project flagfootballleaguemachine
npx -y firebase-tools@latest apphosting:secrets:set STRIPE_PRICE_TEAM --project flagfootballleaguemachine
npx -y firebase-tools@latest apphosting:secrets:set STRIPE_PRICE_LEAGUE_BASE --project flagfootballleaguemachine
npx -y firebase-tools@latest apphosting:secrets:set STRIPE_PRICE_LEAGUE_SEAT --project flagfootballleaguemachine
```

At each hidden prompt, enter only the matching value. The first setting accepts a
restricted API key despite its `SECRET_KEY` name. Approve access only for `flagos-backend`
if prompted. Do not use `--force` to bypass reviewing permissions or configuration edits.

If backend access was not granted, run once per secret:

```powershell
$names = @('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_TEAM', 'STRIPE_PRICE_LEAGUE_BASE', 'STRIPE_PRICE_LEAGUE_SEAT')
foreach ($name in $names) {
  npx -y firebase-tools@latest apphosting:secrets:grantaccess $name --backend flagos-backend --location us-east4 --project flagfootballleaguemachine
  if ($LASTEXITCODE -ne 0) { throw "Access grant failed for $name" }
}
```

Ask the assistant to review the resulting YAML before deployment. Secret creation alone
does not make a variable available to the app: the following entries must appear under
the existing `env:` list in [apphosting.yaml](../apphosting.yaml), without duplicates:

```yaml
  - variable: STRIPE_SECRET_KEY
    secret: STRIPE_SECRET_KEY
    availability:
      - RUNTIME
  - variable: STRIPE_WEBHOOK_SECRET
    secret: STRIPE_WEBHOOK_SECRET
    availability:
      - RUNTIME
  - variable: STRIPE_PRICE_TEAM
    secret: STRIPE_PRICE_TEAM
    availability:
      - RUNTIME
  - variable: STRIPE_PRICE_LEAGUE_BASE
    secret: STRIPE_PRICE_LEAGUE_BASE
    availability:
      - RUNTIME
  - variable: STRIPE_PRICE_LEAGUE_SEAT
    secret: STRIPE_PRICE_LEAGUE_SEAT
    availability:
      - RUNTIME
```

Do not add these references before the secrets exist: unresolved secrets can block a rollout.
Keep `BILLING_CHECKOUT_ENABLED` false during this deployment.

## 9. Run the sandbox acceptance tests

Use a **verified, non-platform-admin account**. Your platform-owner account intentionally
bypasses checkout and creates complimentary entities, so it cannot prove the payment flow.

1. Enable checkout only in the isolated development environment.
2. Start a Team purchase. Confirm CAD 40/month and no trial.
3. Pay using Stripe's sandbox success card `4242 4242 4242 4242`, a future expiry and any
   valid test CVC. Never use test cards in live mode.
4. Return to pricing and finish setup. Confirm exactly one team, an active paid subscription,
   and access under the buyer's account. No duplicate entity on refresh.
5. Repeat with a six-team league: CAD 160/month before tax and six team slots.
6. Cancel a checkout. Confirm no entity is created and no successful charge.
7. Test Stripe's declined card `4000 0000 0000 0002` and authentication-required card
   `4000 0025 0000 3155`. Confirm unpaid/abandoned attempts do not grant access.
8. Close the tab after a successful payment but before setup. Return to pricing: the paid
   purchase should offer **Finish setup** without another charge.
9. Replay the same webhook delivery. Confirm no duplicate fulfillment.
10. Add a league slot. Compare the preview to the invoice and confirm capacity increases
    only after successful payment. Test a failed/authentication-required seat payment too.
11. Remove a team, then lower capacity. Confirm no immediate refund or charge and the next
    recurring invoice uses the lower quantity. Retained teams must remain within capacity.
12. Open Manage billing, update the test card, download an invoice and cancel at period end.
    Confirm period-end cancellation is mirrored without immediate access loss.
13. Test renewals and failed payments, preferably using Stripe test clocks. Check actual
    app access, not just the Dashboard's subscription label.
14. Delete only disposable test entities. Confirm future renewal is stopped and no
    automatic refund is issued.
15. Check all relevant webhook deliveries succeeded and server logs show no processing errors.

The assistant can perform these tests after account access and the isolated environment
are available. Passing mocked unit tests is not proof that Stripe accepted the configuration.

## 10. Resolve launch gates before accepting real subscriptions

Do not treat the previous implementation summary as financial sign-off:

- **Dunning:** a 14-day grace period was approved in the plan, but current code maps
  `past_due` to app `past_due` immediately. Configure Stripe retries and implement/verify
  the approved access grace policy before calling this complete.
- **Seat reductions:** the current code reduces Stripe quantity and app capacity immediately
  with no proration; the lower price is billed at renewal. If capacity itself must remain
  unchanged until renewal, scheduled changes still need implementation.
- **Recovery:** verify how buyers complete pending seat-payment authentication. A message to
  update a card is not by itself a full recovery flow.
- **Environment isolation:** the current billing collections are not partitioned by Stripe
  environment. Never mix sandbox and live purchases in production.
- **Risk review:** refunds, disputes and fraud warnings are flagged in billing documents.
  Confirm an actionable admin review/alert process rather than assuming an email was sent.
- **Platform cap:** `ENTITY_LIMITS.allTeams` is currently 256. Review it intentionally;
  do not remove abuse limits blindly.
- **Policies:** publish approved terms, cancellation/refund policy, privacy and billing support.
- **Tax:** have an accountant confirm Canadian GST/HST and any other applicable obligations.
  Automatic tax is off. Confirm active registrations and product tax treatment before enabling it.
- **Connect/manual invoicing:** organizer payouts, registration collection and separate manual
  invoicing remain deferred. Stripe Billing already generates subscription invoices.

## 11. Live activation

After all gates and sandbox tests pass:

1. Switch Stripe to **live mode** and repeat steps 4-7 with live products, prices, key,
   portal configuration and the production webhook URL. Sandbox resources do not carry over.
2. Store the live values using step 8. Keep checkout disabled and deploy the secret references.
3. Verify the deployment succeeds, signed webhook delivery works, and no secrets appear in logs.
4. Ask the assistant to change `BILLING_CHECKOUT_ENABLED` to `"true"` and deploy that
   specific change. It should verify the rollout, not just push the commit.
5. Open `https://flagos.ca/api/billing/status`. It should return `{"enabled":true}`.
6. Perform a deliberately authorized small live verification using a real payment method;
   never enter Stripe test cards in live mode. A normal plan purchase charges its full price.
   Agree on the charge/refund first; fees may not be returned.
7. Monitor the first real purchases, invoices, webhooks and cancellations.

If something fails, switch `BILLING_CHECKOUT_ENABLED` back to false and redeploy.
This blocks new checkout and app billing actions; it **does not cancel Stripe subscriptions
or stop automatic renewals**. Keep webhook secrets valid and inspect affected subscriptions
in Stripe. Do not delete the signing secret as a rollback.

## What to send the assistant next

After signing in and authorizing MCP, say:

> Stripe is signed in and MCP is authorized. Continue the sandbox setup and planner review.
> Keep live payments off. Tell me when a secure secret prompt or business verification needs me.

Share no secret values in that message.
