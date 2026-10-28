import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MyStoryPage from "@/app/my-story/page";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/",
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

describe("My Story Page (/my-story)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("presents Dexter's story as a clear chronological path from football to FlagOS", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@flagos.ca" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(
      screen.getByRole("heading", { name: /childhood roots in dartmouth/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /high school & the recruiting grind/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /york university varsity career/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /coaching york women's flag football/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /rebuilding & varsity status/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^building flagos$/i }),
    ).toBeInTheDocument();

    expect(screen.getAllByText(/dartmouth destroyers/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/full oua athletic scholarship to york university/i)).toBeInTheDocument();
    expect(screen.getByText(/sleep on a couch in their living room/i)).toBeInTheDocument();
    expect(screen.getByText(/17-8 to qualify for the playoffs/i)).toBeInTheDocument();
    expect(screen.getByText(/york university women's flag football league/i)).toBeInTheDocument();
    expect(screen.getByText(/\$30\/month for team playbooks/i)).toBeInTheDocument();
    expect(screen.getByText(/dextersargent@gmail\.com/i)).toBeInTheDocument();

    const storySections = Array.from(document.querySelectorAll("article[id]")).map(
      (section) => section.id,
    );
    expect(storySections).toEqual([
      "first-football",
      "leaving-home",
      "york",
      "coaching",
      "turnaround",
      "flagos",
    ]);
    expect(
      screen.getByRole("navigation", { name: /story contents/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/photo slot|archived memory slot/i)).toBeNull();
    expect(screen.queryByText(/corporate greed|frictionless sideline/i)).toBeNull();
  });

  it("blocks and redirects unauthorized visitors who are not Dexter", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user-2", email: "visitor@example.com" },
      isPlatformAdmin: false,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/two footballs and an afternoon at recess/i)).toBeNull();
  });

  it("redirects unauthenticated visitors", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isPlatformAdmin: false,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/two footballs and an afternoon at recess/i)).toBeNull();
  });

  it("renders interactive photo frames and allows Dexter to add a photo via modal", () => {
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@flagos.ca" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    // Check that photo buttons exist for chapters
    const addPhotoButtons = screen.getAllByText(/add photo to chapter/i);
    expect(addPhotoButtons.length).toBe(6);

    // Click on chapter 01 add photo
    fireEvent.click(addPhotoButtons[0]);

    // Modal should be open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add photo to chapter 01/i })).toBeInTheDocument();

    // Fill in URL and caption
    const urlInput = screen.getByPlaceholderText("https://example.com/photo.jpg");
    fireEvent.change(urlInput, { target: { value: "https://example.com/dartmouth.jpg" } });

    const captionInput = screen.getByPlaceholderText(/e\.g\. dartmouth destroyers/i);
    fireEvent.change(captionInput, { target: { value: "Dartmouth Destroyers 2011" } });

    // Click Save Photo
    fireEvent.click(screen.getByRole("button", { name: /save photo/i }));

    // Check localStorage saved
    const saved = JSON.parse(localStorage.getItem("flagos_story_photos") || "{}");
    expect(saved["first-football"]).toBeDefined();
    expect(saved["first-football"].url).toBe("https://example.com/dartmouth.jpg");
    expect(saved["first-football"].caption).toBe("Dartmouth Destroyers 2011");
  });

  it("loads and displays saved photos from localStorage", () => {
    localStorage.setItem(
      "flagos_story_photos",
      JSON.stringify({
        york: {
          url: "https://example.com/york51.jpg",
          caption: "Thanksgiving 2022 Touchdown Return",
        },
      }),
    );

    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@flagos.ca" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(screen.getByText("Thanksgiving 2022 Touchdown Return")).toBeInTheDocument();
    const img = screen.getByAltText("Thanksgiving 2022 Touchdown Return");
    expect(img).toHaveAttribute("src", "https://example.com/york51.jpg");
  });

  it("renders loading screen when auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isPlatformAdmin: false,
      loading: true,
    });

    render(<MyStoryPage />);
    expect(screen.getByText(/Loading Story…/i)).toBeInTheDocument();
  });

  it("copies story link to clipboard and displays Link Copied confirmation", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@flagos.ca" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    const shareBtn = screen.getByRole("button", { name: /share/i });
    fireEvent.click(shareBtn);

    expect(mockWriteText).toHaveBeenCalled();
    expect(screen.getByText("Link Copied")).toBeInTheDocument();
  });

  it("removes a saved photo from a chapter and closes modal with Cancel", () => {
    localStorage.setItem(
      "flagos_story_photos",
      JSON.stringify({
        "first-football": {
          url: "https://example.com/photo1.jpg",
          caption: "Dartmouth Destroyers",
        },
      }),
    );

    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@flagos.ca" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    // Click Edit on photo
    const editBtn = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click Remove Photo in modal
    const removeBtn = screen.getByRole("button", { name: /Remove Photo/i });
    fireEvent.click(removeBtn);

    const saved = JSON.parse(localStorage.getItem("flagos_story_photos") || "{}");
    expect(saved["first-football"]).toBeUndefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens photo modal via Enter key and uploads a photo using FileReader", async () => {
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@flagos.ca" },
      isPlatformAdmin: true,
      loading: false,
    });

    // Mock FileReader
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(_file: Blob) {
        this.result = "data:image/png;base64,sampleimagepreview";
        if (this.onload) this.onload();
      }
    }
    vi.stubGlobal("FileReader", MockFileReader);

    render(<MyStoryPage />);

    // Find photo frame for section 1
    const frame = screen.getByRole("button", { name: /Add photo for Childhood Roots in Dartmouth/i });
    fireEvent.keyDown(frame, { key: "Enter" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Trigger file upload
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file = new File(["dummy content"], "photo.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Preview should now show the base64 URL
    const previewImg = screen.getByAltText("Preview");
    expect(previewImg).toHaveAttribute("src", "data:image/png;base64,sampleimagepreview");

    // Close via Cancel button
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("handles window scroll and resize events", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@flagos.ca" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    // Dispatch scroll and resize
    fireEvent.scroll(window, { target: { scrollY: 400 } });
    fireEvent.resize(window);
  });

  it("handles FileReader error, clearing image URL to remove photo, hover overlay actions, and upload trigger", () => {
    localStorage.setItem(
      "flagos_story_photos",
      JSON.stringify({
        "first-football": {
          url: "https://example.com/photo1.jpg",
          caption: "Dartmouth Destroyers",
        },
      }),
    );

    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@flagos.ca" },
      isPlatformAdmin: true,
      loading: false,
    });

    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);

    // Mock FileReader with onerror trigger
    class ErrorFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(_file: Blob) {
        if (this.onerror) this.onerror();
      }
    }
    vi.stubGlobal("FileReader", ErrorFileReader);

    render(<MyStoryPage />);

    // Test hover bar "Change Photo" button
    const changePhotoBtn = screen.getByRole("button", { name: /Change Photo/i });
    fireEvent.click(changePhotoBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click upload trigger button inside modal
    const uploadBtn = screen.getByRole("button", { name: /Choose image file/i });
    fireEvent.click(uploadBtn);

    // Trigger file change with error FileReader
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(["err"], "test.png")] } });
    expect(alertMock).toHaveBeenCalledWith("Failed to read image file. Please try another image.");

    // Clear URL and Save Photo -> removes photo
    const urlInput = screen.getByPlaceholderText("https://example.com/photo.jpg");
    fireEvent.change(urlInput, { target: { value: "" } });
    const saveBtn = screen.getByRole("button", { name: /Save Photo/i });
    fireEvent.click(saveBtn);

    const saved = JSON.parse(localStorage.getItem("flagos_story_photos") || "{}");
    expect(saved["first-football"]).toBeUndefined();
  });
});


