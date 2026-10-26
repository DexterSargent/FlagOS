"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { adminBusinessRequest } from "@/lib/adminBusiness";
import type { NotificationSnapshot } from "@/lib/notificationTypes";
import { EmptyState, Panel, ghostButtonClass } from "./AdminUi";

export default function AdminNotifications() {
  const [snapshot, setSnapshot] = useState<NotificationSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      setSnapshot(await adminBusinessRequest<NotificationSnapshot>("notifications"));
    } catch (error) {
      console.error("Notification status could not be loaded:", error);
      setError(error instanceof Error ? error.message : "Notification status could not be loaded.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function run(action: "notification_test" | "notification_process") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "notification_test") {
        await adminBusinessRequest(action);
        setMessage("Test queued to your signed-in admin email. The scheduler will send it, or choose Process queue. Repeated tests within 10 minutes use the same message.");
      } else {
        const result = await adminBusinessRequest<{ processed: number; accepted: number; retried: number; failed: number; suppressed: number }>(action);
        setMessage(`Processed ${result.processed}: ${result.accepted} accepted by the provider, ${result.retried} waiting to retry, ${result.failed} failed, ${result.suppressed} suppressed. Refresh for delivery updates.`);
      }
      setSnapshot(await adminBusinessRequest<NotificationSnapshot>("notifications"));
    } catch (error) {
      console.error("Notification action failed:", error);
      setError(error instanceof Error ? error.message : "Notification action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel tour="admin-notifications" title="Notification delivery" icon={Mail} action={
      <button type="button" className={`${ghostButtonClass} min-h-11`} onClick={() => void refresh()} disabled={busy}>
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Refresh email status
      </button>
    }>
      <p className="mb-3 text-sm text-neutral-400">Branded operational emails for platform health, season wrap-up and new free-agent interest. Each recipient gets a separate email; addresses are never shared with other recipients.</p>
      {error && <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mb-3 text-sm">{message}</p>}
      {!snapshot ? <EmptyState>{busy ? "Loading email status..." : "Email status is unavailable. Refresh to try again."}</EmptyState> : (
        <>
          <p className="break-words text-sm"><b>{snapshot.enabled ? "Sending enabled" : "Sending blocked"}</b> &middot; {snapshot.from}<br />Replies go to {snapshot.replyTo}.</p>
          {snapshot.configurationIssues.length > 0 && (
            <ul className="my-3 list-inside list-disc space-y-1 text-sm text-amber-200">
              {snapshot.configurationIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          )}
          <p className="my-3 text-sm text-neutral-400">Queued: {snapshot.counts.queued} &middot; Sending: {snapshot.counts.sending} &middot; Provider accepted: {snapshot.counts.accepted} &middot; Delivered: {snapshot.counts.delivered} &middot; Failed: {snapshot.counts.failed} &middot; Bounced: {snapshot.counts.bounced} &middot; Complaints: {snapshot.counts.complained} &middot; Suppressed: {snapshot.counts.suppressed}</p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" className={`${ghostButtonClass} min-h-11`} disabled={busy || !snapshot.enabled} onClick={() => void run("notification_test")}>Queue a test to my email</button>
            <button type="button" className={`${ghostButtonClass} min-h-11`} disabled={busy || !snapshot.enabled} onClick={() => void run("notification_process")}>Process queue</button>
          </div>
          <p className="mb-3 text-xs text-neutral-400">Accepted means Resend received the request. Delivered means the recipient&apos;s mail server accepted it, not that it reached the inbox or was read. Bounces and complaints block future sends to that address. Failed emails are not blindly resent after the safe retry window.</p>
          {snapshot.recent.length === 0 ? <EmptyState>No operational emails have been queued yet.</EmptyState> : (
            <ul className="space-y-2" aria-label="Recent notification deliveries">
              {snapshot.recent.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/10 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2"><b className="min-w-0 break-words">{item.subject}</b><span>{item.status}</span></div>
                  <div className="break-all text-neutral-400">{item.to}</div>
                  <div className="text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString("en-CA")} &middot; {item.attempts} attempt(s)</div>
                  {item.lastError && <p className="mt-1 text-sm">{item.lastError}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-neutral-400">Showing the 50 most recently queued messages. Counts cover the full outbox. Scheduler timing is best-effort, normally every 15 minutes.</p>
        </>
      )}
    </Panel>
  );
}
