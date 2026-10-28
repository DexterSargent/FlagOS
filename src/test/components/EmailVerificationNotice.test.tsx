import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmailVerificationNotice from "@/components/EmailVerificationNotice";
import * as authContext from "@/lib/authContext";

vi.mock("@/lib/authContext", () => ({
  useAuth: vi.fn(),
}));

describe("EmailVerificationNotice", () => {
  const mockResend = vi.fn();
  const mockConfirm = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (authContext.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { email: "tester@flagos.com" },
      resendVerificationEmail: mockResend,
      confirmEmailVerified: mockConfirm,
      logout: mockLogout,
    });
  });

  it("renders notice with user email and handles verification check flow", async () => {
    mockConfirm.mockResolvedValueOnce(false);

    render(<EmailVerificationNotice />);

    expect(screen.getByText("tester@flagos.com")).toBeInTheDocument();
    expect(screen.getByText(/Verify your email to continue/i)).toBeInTheDocument();

    const checkBtn = screen.getByRole("button", { name: /I've verified my email/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(/We still can't see the verification/i);
    });

    // When confirm succeeds
    mockConfirm.mockResolvedValueOnce(true);
    fireEvent.click(checkBtn);
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("handles verification check exceptions gracefully", async () => {
    mockConfirm.mockRejectedValueOnce(new Error("Network glitch"));

    render(<EmailVerificationNotice />);

    const checkBtn = screen.getByRole("button", { name: /I've verified my email/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't refresh your account. Try again.");
    });
  });

  it("handles resend verification email success and error flows", async () => {
    mockResend.mockResolvedValueOnce({ success: true, message: "New verification link sent to your inbox!" });

    render(<EmailVerificationNotice />);

    const resendBtn = screen.getByRole("button", { name: /Resend verification email/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent("New verification link sent to your inbox!");
    });

    // When resend fails
    mockResend.mockResolvedValueOnce({ success: false, message: "Too many requests. Please wait a moment." });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Too many requests. Please wait a moment.");
    });
  });

  it("calls logout when Sign out button is clicked", () => {
    render(<EmailVerificationNotice />);

    const signOutBtn = screen.getByRole("button", { name: /Sign out/i });
    fireEvent.click(signOutBtn);

    expect(mockLogout).toHaveBeenCalled();
  });
});
