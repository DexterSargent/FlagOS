import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";

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

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock window.scrollTo
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

// In-memory SessionStorage & LocalStorage reset
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.clearAllMocks();
});
