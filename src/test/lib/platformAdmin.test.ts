import { describe, it, expect } from "vitest";
import {
  PLATFORM_ADMIN_EMAIL,
  PLATFORM_ADMIN_EMAILS,
  isPlatformAdminEmail,
} from "@/lib/platformAdmin";

describe("platformAdmin", () => {
  it("defines dextersargent@flagos.ca as the primary platform admin", () => {
    expect(PLATFORM_ADMIN_EMAIL).toBe("dextersargent@flagos.ca");
  });

  it("authorizes both dextersargent@flagos.ca and dextersargent@gmail.com", () => {
    expect(isPlatformAdminEmail("dextersargent@flagos.ca")).toBe(true);
    expect(isPlatformAdminEmail("DEXTERSARGENT@FLAGOS.CA")).toBe(true);
    expect(isPlatformAdminEmail("dextersargent@gmail.com")).toBe(true);
    expect(isPlatformAdminEmail("DEXTERSARGENT@GMAIL.COM")).toBe(true);
  });

  it("rejects unauthorized emails", () => {
    expect(isPlatformAdminEmail("other@flagos.ca")).toBe(false);
    expect(isPlatformAdminEmail("random@gmail.com")).toBe(false);
    expect(isPlatformAdminEmail(null)).toBe(false);
    expect(isPlatformAdminEmail(undefined)).toBe(false);
    expect(isPlatformAdminEmail("")).toBe(false);
  });
});
