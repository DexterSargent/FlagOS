import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNotifications from "@/components/admin/AdminNotifications";
import type { NotificationSnapshot } from "@/lib/notificationTypes";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/adminBusiness", () => ({ adminBusinessRequest: request }));
const snapshot: NotificationSnapshot = {
  enabled: true, configurationIssues: [], from: "FlagOS <notifications@flagos.ca>", replyTo: "coach@flagos.ca",
  counts: { queued: 1, sending: 0, accepted: 1, delivered: 0, failed: 0, bounced: 0, complained: 0, suppressed: 0 },
  recent: [{ id: "1", kind: "service_test", to: "owner@example.com", subject: "A service test", status: "accepted", attempts: 1, createdAt: Date.now(), updatedAt: Date.now(), lastError: null }],
};
describe("admin notification delivery", () => {
  beforeEach(() => { request.mockResolvedValue(snapshot); });

  it("shows honest provider status and queues a test only through the admin action", async () => {
    render(<AdminNotifications />);
    await screen.findByText("Sending enabled");
    expect(screen.getByText(/Accepted means Resend/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Queue a test to my email" }));
    await screen.findByRole("status");
    expect(request).toHaveBeenCalledWith("notification_test");
  });

  it("shows configuration problems and disables sends", async () => {
    request.mockResolvedValue({ ...snapshot, enabled: false, configurationIssues: ["Email sending is switched off."] });
    render(<AdminNotifications />);
    await screen.findByText("Sending blocked");
    expect(screen.getByText("Email sending is switched off.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Queue a test to my email" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Process queue" })).toBeDisabled();
  });

  it("surfaces request failures and provides a refresh retry", async () => {
    request.mockRejectedValueOnce(new Error("Delivery status unavailable"));
    render(<AdminNotifications />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Delivery status unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Refresh email status" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(await screen.findByText("Sending enabled")).toBeInTheDocument();
  });
});
