import { describe, expect, it } from "vitest";
import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";

describe("readLimitedRequestBody", () => {
  it("rejects a body that exceeds the limit while streaming", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ value: "too large" }),
    });

    await expect(readLimitedRequestBody(request, 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects an oversized declared body before reading it", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "content-length": "9" },
      body: "{}",
    });

    await expect(readLimitedRequestBody(request, 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("returns a body within the byte limit", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: '{"ok":true}',
    });

    await expect(readLimitedRequestBody(request, 11)).resolves.toBe('{"ok":true}');
  });
});
