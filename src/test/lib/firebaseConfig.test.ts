import { describe, expect, it } from "vitest";
import { cleanFirebaseConfigValue } from "@/lib/firebaseConfig";

describe("cleanFirebaseConfigValue", () => {
  it("removes matching quote wrappers from Firebase App Hosting values", () => {
    expect(cleanFirebaseConfigValue('"AIzaExampleKey"')).toBe("AIzaExampleKey");
    expect(cleanFirebaseConfigValue("'flagos.firebaseapp.com'")).toBe("flagos.firebaseapp.com");
  });

  it("trims whitespace and leaves unquoted values unchanged", () => {
    expect(cleanFirebaseConfigValue("  flagos-project  ")).toBe("flagos-project");
  });

  it("preserves undefined and empty configuration values", () => {
    expect(cleanFirebaseConfigValue(undefined)).toBeUndefined();
    expect(cleanFirebaseConfigValue("  ")).toBeUndefined();
  });
});
