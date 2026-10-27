import { FLAGOS_LOADER_PINWHEEL } from "@/lib/brandTokens";

export default function FlagOSLoader({
  className = "",
  size = 80,
  label = "Loading",
}: {
  className?: string;
  size?: number;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img
        src={FLAGOS_LOADER_PINWHEEL}
        alt=""
        aria-hidden="true"
        width={440}
        height={440}
        className="h-full w-full object-contain"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
