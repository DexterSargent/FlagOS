export default function LeagueFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black py-8 px-6 text-xs text-neutral-400 font-sans">
      <div className="max-w-7xl mx-auto text-center">
        <span>© {new Date().getFullYear()} FlagOS. All rights reserved.</span>
      </div>
    </footer>
  );
}
