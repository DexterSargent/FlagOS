# FlagOS financial integration and automation plan

Prepared 26 October 2026. This is a proposed implementation plan, not authorization to
charge customers, register for taxes, open financial accounts, or migrate existing billing.

## Recommended approach

Use **Stripe Checkout + Billing + Customer Portal** for FlagOS subscriptions.
Use the branded notification service for operational messages and a single accounting
system for the books. Start with **QuickBooks Online or Xero**, selected with the bookkeeper;
do not build a second general ledger inside FlagOS. Prefer an established Stripe connector
over maintaining a custom accounting integration initially.

Default proposal: CAD, monthly subscriptions, Stripe-hosted card entry, automatic payouts
to the business bank account. Currency, legal entity, operating province, tax registration,
accounting software and policies still require owner confirmation.

**Build subscription collection first. Treat collecting player/team registration fees and
paying organizers as a separate marketplace project.** FlagOS software revenue and money
owed to leagues must never be mixed in one revenue total.

## Where the app stands

- Public pricing: independent team $40/month; league $40/month base + $20/team/month.
  A 10-team league is $240/month before any applicable tax.
- Creation is currently restricted for development, with explicit complimentary access.
  There is no Stripe checkout, payment webhook, customer portal or automatic card collection.
- The admin Finance page supports manually entered income/expenses, plan settings and
  renewal dates. A manual ledger entry or an `active` subscription field is **not** proof
  that a processor received money.
- League member teams inherit league coverage. They must not get independent invoices
  simply because they exist or because their league is deleted.
- The email implementation in this change is an operational foundation: branded HTML/text,
  persistent queue, retries, delivery webhooks, suppression, and admin status. It is not
  an in-app inbox or a complete member/game notification system.

## Decisions to approve

- [x] Use Stripe for FlagOS subscriptions and hosted payment-method management.
- [x, I will input these when necessary] Confirm CAD, the business legal name/address/province, bank account and billing contact.
- [x, idk, advise me] Confirm whether prices exclude tax; have an accountant confirm GST/HST/QST/PST obligations.
- [x] Preserve explicit complimentary grants for testing/coaching; never silently convert them
  to paid plans or create processor subscriptions for them.
- [no trial, the demo league should be enough, remove this promise] Confirm public trial policy. The site currently advertises 14 days/no card required;
  the recommended paid-launch flow must honour this or update the promise before launch.
- [x] Proposed dunning: payment-update email, processor-managed retries for 14 days, then
  a non-destructive restricted mode if unpaid. Confirm exact grace/access policy.
- [x] Proposed cancellation: end of the paid period, with clear confirmation. Refunds require
  an explicit owner decision and do not silently cancel a subscription.
- [x] Proposed seat changes: show the next bill/proration before confirmation; additions take
  effect after payment confirmation, reductions next renewal and never below retained teams.
- [x] Choose one accounting package and one Stripe connector with the bookkeeper.
- [x, idk what you mean by organizer payouts] Keep registration fees/organizer payouts out of the first launch.

## Phase 0 - Business and launch controls

**Deliverables**

1. Verify the processor account, legal business details, payout bank and support contacts.
2. Approve terms, refund/cancellation policy, privacy notice, tax treatment and email sender.
   Do not link emails to legal pages that do not exist.
3. Separate test/live keys, webhook secrets and event stores. Keep all secrets server-side
   in Secret Manager; never use `NEXT_PUBLIC_` for processor or email secrets.
4. Maintain a server-side paid-signup feature flag. Do not remove the current creation gate
   before checkout, server authorization and entitlement handling all pass.
5. Inventory existing customers: complimentary, legacy manual-paid, trial, league-covered.
   Confirm each mapping before migration. No surprise invoices or retrospective charges.

**Exit gate:** owner approves the decisions above, processor setup is complete, and test mode
cannot affect production entitlements or send uncontrolled customer emails.

## Phase 1 - Checkout, billing ownership and entitlements

**Pricing model**

| Customer | Processor subscription | Entitlement |
| --- | --- | --- |
| Independent team | One $40/month price | That team only |
| League | One $40/month base item + $20/month team-seat item with approved quantity | League plus its covered teams |
| League member team | No independent subscription | Inherits its league's coverage |
| Complimentary customer | No charge/subscription required | Explicit audited grant, with optional expiry |

Store monetary amounts as integer minor units with currency, not floating-point totals.
Price IDs and permitted quantities come from the server; ignore client-supplied price,
customer, discount and entitlement values.

**Implementation**

- Add authenticated server routes to create Checkout and Customer Portal sessions.
  Verify the caller owns the exact league/team billing account; platform-admin overrides
  must be explicit and audited.
- Reserve a pending creation/upgrade request before checkout. Bind processor customer,
  account ID and subscription IDs to that record on the server. An email address alone
  must not establish ownership.
- Use stable request idempotency keys. Recover abandoned sessions safely and prevent
  duplicate subscriptions when users double-click or retry.
- Provision/extend paid access from verified processor state, **never** a success redirect.
  Handle the no-card trial as its own approved entitlement, with an explicit transition
  to payment collection when the trial ends.
- Preserve the existing complimentary path, but distinguish `complimentary`, `trial`,
  `processor_paid`, `legacy_manual` and `league_covered` in the entitlement model.
- Offer customer self-service for invoices, payment methods and cancellation. Restrict
  unsupported league-quantity changes in the hosted portal until capacity rules are enforced.
- Prevent double billing when independent teams join a league: confirm what happens to
  their old subscription, effective dates and any credit before transferring coverage.
- League deletion must handle its actual processor subscription separately from data cleanup.
  Kept member teams need an explicit coverage decision, not automatic billing or continued
  paid access based only on a detached league link. Never automatically delete financial history.

**Suggested private records**

| Record | Purpose |
| --- | --- |
| `billing_accounts/{id}` | Billing owner, entity kind/ID, currency, processor customer/subscription references |
| `billing_events/{processorEventId}` | Verified receipt, processing state, retries and last error |
| `billing_invoices/{processorInvoiceId}` | Net/tax/gross minor units, currency, invoice state and hosted links |
| `billing_transactions/{balanceTransactionId}` | Immutable payments, fees, refunds and disputes for reconciliation |
| `billing_entitlements/{entityId}` | Access source, current paid/trial/grant window and parent coverage |
| `billing_reconciliation/{runId}` | Drift, payout mismatch and missing-event exceptions |

Names are proposed, not collections created by this change. Keep billing PII and processor
references out of publicly readable league/team documents.

**Exit gate:** test mode covers independent team, league quantities, no-card trial,
complimentary accounts, parent-covered teams, double-clicks and checkout abandonment.

## Phase 2 - Reliable payment events and customer communications

Use a bounded **raw-body signature-verified webhook**, persist each event before handling,
acknowledge only durable receipt, and process idempotently outside the request where needed.
Deduplicate by processor event ID and by the underlying financial object: different events
can describe the same payment. Retrieve current processor state where ordering is ambiguous;
an older event must not roll back a newer subscription state.

| Event/condition | Automation |
| --- | --- |
| Checkout completed | Bind the reserved account; reconcile subscription/payment state before granting paid access |
| Invoice paid | Record once, update confirmed entitlement period, queue one receipt path |
| Invoice payment failed | Record failure and grace deadline; queue payment-update link, let Stripe retry the charge |
| Subscription changed/ended | Reconcile current items, coverage and cancellation dates |
| Trial ending | Send an accurate reminder and authorized payment/setup link |
| Refund/dispute | Add immutable adjustment and owner exception; do not delete the original sale |
| Payout failed | Notify owner through email plus an independent operational alert |

Choose **one sender per financial message**. Recommended first launch: Stripe owns statutory
invoices/payment receipts and collection emails with configured branding; FlagOS owns
access/coverage explanations and owner exception digests. If FlagOS later sends custom
receipts, disable overlapping Stripe receipt settings after testing. Never claim a payment
succeeded from a plan edit, manual renewal update or client callback.

Use the new outbox in the same transaction/batch as the processed billing event. All financial
actions require server authorization and an audit trail. Customer-facing payment links should
go through an authenticated FlagOS route that creates an authorized portal session, not expose
another customer's billing URL.

**Exit gate:** duplicate/out-of-order events, timeouts, worker crashes, partial failures,
strong customer authentication, delayed payments and webhook replay do not double-charge,
double-send, double-book revenue, or grant another account access.

## Phase 3 - Recovery and exception-only maintenance

- Configure Stripe Smart Retries rather than writing a competing charge scheduler.
  Proposed starting policy: up to 14 days, with the owner-approved grace period.
- On recovery, restore the correct entitlement once; cancel stale dunning messages.
- On exhaustion, apply the approved restricted mode. Do not delete rosters, plays, or stats.
  Decide public-score access separately from paid editing access.
- Support refund/cancellation from the processor first, then verified events update FlagOS.
  If adding admin refund controls later, require amount bounds, explicit confirmation,
  stable idempotency keys, audit entries and reversal-based accounting.
- Store scoped, auditable complimentary grants with reason/expiry. Expiry prompts a choice,
  never an automatic card charge.
- Daily reconciliation checks processor state against local entitlements and invoice history.
  Surface drift as an exception, with safe repair tooling; don't overwrite intentional grants.

**Owner workload target:** routine renewals, receipts and payment recovery need no manual
ledger entry. An owner reviews unresolved exceptions and refunds, not every successful sale.

## Phase 4 - Bookkeeping, reconciliation and admin reporting

Use the processor's balance transactions and payout reconciliation reports as the source for
cash settlement. Match bank deposits to payout IDs, not to individual invoices alone.

- Separate gross sales, discounts, tax collected, refunds, disputes, fees and net payouts.
  A payout is a movement of cash, **not a second sale**. Tax collected is a liability,
  not subscription revenue.
- Deduplicate connector imports and FlagOS projections by processor object ID. Choose
  one system to write accounting transactions; a connector and custom sync must not both post.
- Make imported financial records immutable in FlagOS. Corrections use adjustment/reversal
  entries. Retain manual entries for genuine offline payments/expenses with a distinct source.
  Remove the ability to delete a synced payment using today's manual-ledger delete action.
- Track recurring plan revenue separately from actual cash received. Complimentary plans,
  sales tax, one-off revenue and league-covered teams must not inflate MRR.
- Dashboard: paid/complimentary accounts, expected recurring revenue, net collected, tax,
  processor fees, refunds, failed payments, overdue invoices, and payout/reconciliation status.
- Daily: reconcile recent processor objects with an overlapping cursor/backfill window.
  Alert on failed syncs, missing events or non-zero discrepancies; never replace unavailable
  financial figures with an apparently successful zero.
- Weekly owner digest: only overdue recovery, subscription drift, unreconciled payouts,
  disputes and unusual refunds. No daily "everything worked" emails.
- Monthly: accountant-approved close/export, tax review and bank/processor balance check.
  Retention periods and revenue recognition rules follow the accountant's advice.

**Exit gate:** sampled payouts reconcile exactly in minor units; replaying the sync imports
no duplicates; refunds and taxes balance; accountant signs off on mapping and reports.

## Phase 5 - Optional registration fees and organizer payouts

Only after the subscription business is stable, assess Stripe Connect for league registration
payments, connected-account onboarding, identity verification, payout timing and application
fees. Confirm who is merchant of record, liable for disputes/refunds, responsible for tax
invoicing, and permitted to receive funds. Fees, KYC and supported capabilities vary.

Do not collect registration fees into FlagOS's own operating account and manually redistribute
them as a shortcut. Keep organizer liabilities, platform fees and subscription revenue separate.
Define cancellation/weather refunds, partial refunds, chargebacks, guardian consent and failed
payout handling before accepting any registration payment.

**Exit gate:** a separately approved product/legal plan and test reconciliation across
platform, organizer and participant perspectives.

## Notification roadmap alongside billing

| Order | Coverage | Prerequisite |
| --- | --- | --- |
| Now | Branded operational reports, season reminders, admin free-agent alerts | Activate sender/secrets/webhook/scheduler using the operations runbook |
| Next | Branded Firebase verification and reset templates, or server-generated Firebase action links sent through this service | Confirm sender/action domains; preserve generic reset responses, expiry, rate limiting and anti-enumeration |
| Next | Team invitations, role/roster changes, join-request outcomes | Server-authoritative business events, recipient ownership and private-data checks; never mail from client effects |
| Next | In-app notification centre and per-category preferences | User-scoped storage/rules, accessible unread/read controls, deep-link authorization and cross-account tests |
| After scheduler upgrade | Game reminders, reschedules and cancellations | Cloud Tasks/Scheduler, league time zones, event versioning, cancellation of stale queued reminders, preferences and digest limits |
| With billing | Financial confirmations and payment recovery | Verified payment events, one receipt owner, approved grace policy |
| Later if useful | SMS or push | Explicit consent, country costs, opt-out handling and delivery monitoring |

Keep operational/security messages separate from optional game updates and marketing.
Have Canadian consent, unsubscribe and identification requirements reviewed before introducing
commercial campaigns; operational branding alone is not a compliance exemption.
Decide payload retention and preserve deduplication tombstones before enabling high-volume events.
Avoid emailing private rosters, health information or children's personal details.

## Launch and rollback checklist

- [ ] Unit/integration tests plus processor sandbox scenarios pass.
- [ ] A controlled owner test covers checkout, invoice, renewal, failed payment, recovery,
  cancellation, refund, signed events, email suppression and payout reconciliation.
- [ ] Existing free/coaching accounts stay free. No private test customer is auto-migrated.
- [ ] Backups, alert recipients, webhook replay and daily reconciliation are verified.
- [ ] Paid signup is enabled for a small approved cohort before opening it publicly.
- [ ] Rollback disables **new checkout**, not incoming verified payment/refund webhooks.
  Keep processing existing obligations and recovery; don't strand paying customers.
- [ ] Monitor exceptions after each rollout; expand only once financial totals reconcile.

## Sources and dependencies

Checked against official documentation on 26 October 2026. Product pricing and availability
must be rechecked at implementation; no processor, connector or tax-service fee is assumed free.

- [Stripe subscription webhook lifecycle](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe hosted Customer Portal](https://docs.stripe.com/customer-management)
- [Stripe Smart Retries and limitations](https://docs.stripe.com/billing/revenue-recovery/smart-retries)
- [Stripe payout reconciliation](https://docs.stripe.com/reports/payout-reconciliation)
- [CRA: when to register and start charging GST/HST](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html)
  - Most-business small-supplier rules commonly involve a $30,000 threshold, but timing,
    associated-person revenue and applicability matter. This plan does not determine tax status.
- [Resend send API](https://resend.com/docs/api-reference/emails/send-email),
  [24-hour idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys),
  and [webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Operational notification activation and failure handling](OPERATIONS.md#branded-operational-notifications)
