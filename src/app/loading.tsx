import FlagOSLoader from "@/components/FlagOSLoader";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background">
      <FlagOSLoader size={112} label="Loading FlagOS" />
    </div>
  );
}
