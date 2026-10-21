import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useDemoSandbox } from "@/lib/useDemoSandbox";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/demoSandboxRuntime", () => ({ loadDemoSandbox: mocks.load }));

it("surfaces a load failure and retries only on request", async () => {
  const error = new Error("Chunk unavailable");
  const sandbox = { getSandboxSettings: vi.fn() };
  mocks.load.mockRejectedValueOnce(error).mockResolvedValueOnce(sandbox);
  const hook = renderHook(() => useDemoSandbox(true));
  await waitFor(() => expect(hook.result.current.error).toBe(error));
  expect(hook.result.current).toMatchObject({ sandbox: null, loading: false });
  expect(mocks.load).toHaveBeenCalledOnce();
  act(() => { hook.result.current.retry(); });
  expect(hook.result.current).toMatchObject({ sandbox: null, loading: true, error: null });
  await waitFor(() => expect(hook.result.current.sandbox).toBe(sandbox));
  expect(hook.result.current).toMatchObject({ loading: false, error: null });
  expect(mocks.load).toHaveBeenCalledTimes(2);
});
