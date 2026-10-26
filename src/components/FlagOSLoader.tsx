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
        src="/flagos-loading-gear.webp"
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        className="absolute inset-0 h-full w-full object-contain motion-safe:animate-spin motion-reduce:animate-none"
        style={{ animationDuration: "3s" }}
      />
      <img
        src="/flagos-loading-football.webp"
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        className="relative h-full w-full object-contain"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
