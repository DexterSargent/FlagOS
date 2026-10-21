import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useDemoSandbox } from "@/lib/useDemoSandbox";

const mocks = vi.hoisted(() => ({
  imported: vi.fn(),
  finish: null as null | (() => void),
}));
vi.mock("@/lib/demoSandbox", async () => {
  mocks.imported();
  await new Promise<void>((resolve) => { mocks.finish = resolve; });
  return { getSandboxSettings: vi.fn() };
});

it("loads only when enabled and discards an import completed after disabling", async () => {
  const hook = renderHook(({ enabled }) => useDemoSandbox(enabled), { initialProps: { enabled: false } });
  expect(hook.result.current).toMatchObject({ sandbox: null, loading: false, error: null });
  expect(mocks.imported).not.toHaveBeenCalled();
  hook.rerender({ enabled: true });
  expect(hook.result.current.loading).toBe(true);
  await waitFor(() => expect(mocks.imported).toHaveBeenCalledOnce());
  hook.rerender({ enabled: false });
  await act(async () => { mocks.finish!(); });
  expect(hook.result.current).toMatchObject({ sandbox: null, loading: false, error: null });
  hook.rerender({ enabled: true });
  await waitFor(() => expect(hook.result.current.sandbox).not.toBeNull());
  expect(hook.result.current.loading).toBe(false);
  expect(mocks.imported).toHaveBeenCalledOnce();
  act(() => { hook.result.current.retry(); });
  await waitFor(() => expect(hook.result.current.sandbox).not.toBeNull());
  expect(hook.result.current.error).toBeNull();
});
