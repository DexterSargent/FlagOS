import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountPage from "@/app/account/page";

const { useAuthMock, requestMock, confirmMock, connectMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(), requestMock: vi.fn(), confirmMock: vi.fn(), connectMock: vi.fn(),
}));
vi.mock("@/lib/authContext", () => ({ useAuth: useAuthMock }));
vi.mock("@/lib/accountEmails", () => ({
  accountEmailRequest: requestMock, confirmAccountOwner: confirmMock, connectAccountEmail: connectMock,
}));
const user = { uid: "primary", email: "primary@example.com", emailVerified: true };

describe("connected email settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user, loading: false, logout: vi.fn() });
    requestMock.mockResolvedValue({ accountUid: "primary", emails: [{ uid: user.uid, email: user.email }] });
    confirmMock.mockResolvedValue(undefined);
    connectMock.mockResolvedValue(undefined);
  });

  it("requires sign-in rather than exposing email connections to spectators", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    render(<AccountPage />);
    expect(screen.getByRole("link", { name: /Sign in to manage/ })).toHaveAttribute("href", "/login?redirect=%2Faccount");
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("requires reauthentication before showing additional-email credentials", async () => {
    render(<AccountPage />);
    expect(await screen.findByText("Connected sign-in emails (1)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Additional email")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Primary account password"), { target: { value: "primary-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm with password" }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith(user, "primary-password"));
    expect(await screen.findByLabelText("Additional email")).toBeInTheDocument();
  });

  it("connects an email only after proving both sign-ins, then refreshes the list", async () => {
    render(<AccountPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm with Google instead" }));
    fireEvent.change(await screen.findByLabelText("Additional email"), { target: { value: "secondary@example.com" } });
    fireEvent.change(screen.getByLabelText("Additional account password"), { target: { value: "secondary-password" } });
    requestMock.mockResolvedValue({ accountUid: "primary", emails: [
      { uid: user.uid, email: user.email }, { uid: "secondary", email: "secondary@example.com" },
    ] });
    fireEvent.click(screen.getByRole("button", { name: "Connect email" }));
    expect(await screen.findByText("Email connected. Sign in with either address to use this account.")).toBeInTheDocument();
    expect(connectMock).toHaveBeenCalledWith(user, { email: "secondary@example.com", password: "secondary-password" });
    expect(screen.getByText("Connected sign-in emails (2)")).toBeInTheDocument();
    expect(screen.getByLabelText("Additional account password")).toHaveValue("");
  });

  it("reports failed ownership verification without claiming a connection", async () => {
    connectMock.mockRejectedValue(new Error("Verify the additional email before connecting it."));
    render(<AccountPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm with Google instead" }));
    fireEvent.click(await screen.findByRole("button", { name: "Connect another Google account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Verify the additional email");
    expect(screen.queryByText(/Email connected\\./)).not.toBeInTheDocument();
  });
});
