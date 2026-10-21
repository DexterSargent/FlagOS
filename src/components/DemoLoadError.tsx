"use client";

export default function DemoLoadError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p>The demo could not be loaded. Check your connection and try again.</p>
      <button type="button" onClick={retry} className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black">Retry demo</button>
    </div>
  );
}
