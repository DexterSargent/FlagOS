import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { beforeEach, vi } from "vitest";

configure({ asyncUtilTimeout: 4000 });

// Mock Firebase client
vi.mock("@/lib/firebase", () => ({
  app: {},
  db: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn((cb) => {
      cb(null);
      return () => {};
    }),
  },
}));

// Mock matchMedia for responsive UI components & ThemeContext
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  window.scrollTo = vi.fn();
}

if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof globalThis !== "undefined") {
  // Mock ResizeObserver
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// In-memory SessionStorage & LocalStorage reset
beforeEach(() => {
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
  if (typeof localStorage !== "undefined") localStorage.clear();
  vi.clearAllMocks();
});
