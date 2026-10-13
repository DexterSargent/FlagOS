"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  BookOpen,
  Plus,
  Save,
  Trash2,
  Copy,
  Printer,
  Check,
  Shield,
  Zap,
  Layers,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  Sliders,
  Edit2,
  ArrowRight,
  FolderPlus,
  ShieldAlert
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import PlayCanvas from "@/components/playbook/PlayCanvas";
import CreatePlaybookModal from "@/components/playbook/CreatePlaybookModal";
import CreateFormationModal from "@/components/playbook/CreateFormationModal";
import PrintArmbandModal from "@/components/playbook/PrintArmbandModal";
import MiniPlayDiagram from "@/components/playbook/MiniPlayDiagram";
import {
  Playbook,
  PlayDiagram,
  FormationAlignment,
  DEFAULT_LOS_Y,
  MAX_PLAYBOOKS_PER_TEAM,
  createDefaultPlaybooks,
  migrateRawPlaysToPlaybooks,
  createPlayInFormation,
  ensureSquadMatchup,
  ensure5v5Matchup
} from "@/lib/playbookTypes";
import { getSandboxTeams } from "@/lib/demoSandbox";

type PlaybookViewLevel = "playbooks" | "formations" | "plays";

export default function TeamPlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;

  const { canManageTeam, role, isPlayer, playerTeamId, isLeagueAdmin, isTeamAdmin, managedTeamId } = useAuth();
  const { settings, isDemoLeague } = useLeague();
  const playersPerSide = settings?.rules?.playersOnField || 5;

  const [team, setTeam] = useState<any>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [activePlaybookId, setActivePlaybookId] = useState<string>("");
  const [selectedFormationName, setSelectedFormationName] = useState<string>("");
  const [activePlayId, setActivePlayId] = useState<string>("");

  const isDemoTeam =
    !teamId.startsWith("team_live_") &&
    (teamId === "team_apex" ||
      teamId === "team_cyber" ||
      teamId === "team_raptors" ||
      teamId === "team_vipers" ||
      teamId === "demo" ||
      teamId.startsWith("team_demo_") ||
      (teamId.startsWith("team_") && !teamId.startsWith("team_live_")));

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("demo") === "true" || sp.get("embed") === "true" || isDemoTeam || sessionStorage.getItem("flagos_demo_active") === "true";
    }
    return isDemoTeam;
  });

  const [isEmbedded, setIsEmbedded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("embed") === "true";
    }
    return false;
  });

  // 3-Level Drilldown View State: "playbooks" -> "formations" -> "plays"
  const [viewLevel, setViewLevel] = useState<PlaybookViewLevel>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true" || sp.get("level") === "plays") {
        return "plays";
      }
    }
    return "playbooks";
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modals
  const [isCreatePlaybookOpen, setIsCreatePlaybookOpen] = useState(false);
  const [isFormationModalOpen, setIsFormationModalOpen] = useState(false);
  const [editingFormation, setEditingFormation] = useState<FormationAlignment | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showOpposingSide, setShowOpposingSide] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("demo") === "true" || isDemoTeam || isDemoLeague) {
        setIsDemoMode(true);
      }
      if (sp.get("embed") === "true") {
        setIsEmbedded(true);
        setViewLevel("plays");
      }
    }
  }, [teamId, isDemoTeam, isDemoLeague]);

  const isEffectDemo = isDemoLeague || isDemoTeam || isDemoMode;

  // Strict Playbook RBAC:
  // 1. League admins have NO access (competitive integrity & strategic confidentiality policy)
  // 2. Authorized team admins can EDIT playbooks for their team only
  // 3. Players have VIEW-ONLY access to their team only
  // 4. Opponent coaches, opponent players, spectators, and unauthenticated users have NO access
  // Note: isEmbedded allows the interactive showcase on the marketing landing page (/page.tsx) to demo the studio
  const isTeamAdminForThisTeam = isTeamAdmin(teamId);
  const isRosteredPlayerOnTeam = isPlayer && playerTeamId === teamId;
  const isOpponentCoach = isTeamAdmin() && !isTeamAdminForThisTeam;
  const isOpponentPlayer = isPlayer && !isRosteredPlayerOnTeam;

  // League admins are strictly forbidden from viewing or modifying team playbooks
  const isBlockedLeagueAdmin = !isEmbedded && isLeagueAdmin;

  // Edit access: strictly team admins of THIS team
  const hasEditAccess = !isBlockedLeagueAdmin && (isEmbedded || isTeamAdminForThisTeam);

  // View access: team admins of THIS team OR rostered players of THIS team
  const canViewPlaybook = !isBlockedLeagueAdmin && (isEmbedded || isTeamAdminForThisTeam || isRosteredPlayerOnTeam);

  // 1. Fetch Team & Playbooks from Firestore / LocalStorage
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isEmbedded) {
          const sTeam = getSandboxTeams().find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
          if (sTeam) {
            setTeam({ id: sTeam.id, name: sTeam.name, shortcode: (sTeam as any).shortcode || getTeamShortcode(sTeam) });
          } else {
            setTeam({ id: teamId, name: "Kansas City", shortcode: "KC" });
          }
        } else {
          try {
            const teamSnap = await getDoc(doc(db, "teams", teamId));
            if (teamSnap.exists()) {
              const tData = { id: teamSnap.id, ...(teamSnap.data() as any) };
              if (isRealTeam(tData)) {
                setTeam(tData);
              }
            } else if (isEffectDemo) {
              const sTeam = getSandboxTeams().find((t) => t.id === teamId);
              if (sTeam) {
                setTeam({ id: sTeam.id, name: sTeam.name, shortcode: (sTeam as any).shortcode || getTeamShortcode(sTeam) });
              } else {
                setTeam({ id: teamId, name: "Apex Predators", shortcode: "APX" });
              }
            }
          } catch (e) {
            console.warn("Unable to fetch live team from Firestore:", e);
            const sTeam = getSandboxTeams().find((t) => t.id === teamId);
            if (sTeam) {
              setTeam({ id: sTeam.id, name: sTeam.name, shortcode: (sTeam as any).shortcode || getTeamShortcode(sTeam) });
            }
          }
        }

        // If user is league admin or unauthorized, do not load confidential playbooks
        if (!isEmbedded && (isBlockedLeagueAdmin || (!isTeamAdminForThisTeam && !isRosteredPlayerOnTeam))) {
          setLoading(false);
          return;
        }

        let loadedPlaybooks: Playbook[] = [];

        if (!isEmbedded) {
          try {
            const playbookDocSnap = await getDoc(doc(db, "teams", teamId, "meta", "playbook"));
            if (playbookDocSnap.exists()) {
              const data = playbookDocSnap.data();
              if (data?.playbooks && Array.isArray(data.playbooks)) {
                loadedPlaybooks = data.playbooks;
              } else if (data?.plays && Array.isArray(data.plays)) {
                loadedPlaybooks = migrateRawPlaysToPlaybooks(data.plays, teamId);
              }
            }
          } catch (e) {
            console.warn("Unable to fetch live playbook from Firestore:", e);
          }
        }

        // Check local storage fallback
        if (!loadedPlaybooks || loadedPlaybooks.length === 0) {
          if (typeof window !== "undefined") {
            const cachedPlaybooks = localStorage.getItem(`flagos_playbooks_${teamId}`);
            if (cachedPlaybooks) {
              try {
                loadedPlaybooks = JSON.parse(cachedPlaybooks);
              } catch (e) {}
            } else {
              const legacyCached = localStorage.getItem(`flagos_playbook_${teamId}`);
              if (legacyCached) {
                try {
                  const rawPlays = JSON.parse(legacyCached);
                  loadedPlaybooks = migrateRawPlaysToPlaybooks(rawPlays, teamId);
                } catch (e) {}
              }
            }
          }
        }

        // Seed with default playbooks if team has none
        if (!loadedPlaybooks || loadedPlaybooks.length === 0) {
          loadedPlaybooks = createDefaultPlaybooks(teamId, playersPerSide);
        }

        // Guarantee squad format for every play (respecting book.playersOnField or league rules)
        loadedPlaybooks = loadedPlaybooks.map((book) => {
          const bookSquad = book.playersOnField || playersPerSide;
          return {
            ...book,
            playersOnField: bookSquad,
            plays: (book.plays || []).map((p) => ({
              ...p,
              players: ensureSquadMatchup(p.players || [], p.losY || DEFAULT_LOS_Y, bookSquad),
            })),
          };
        });

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(loadedPlaybooks));
          } catch (e) {}
        }

        setPlaybooks(loadedPlaybooks);
        if (loadedPlaybooks.length > 0) {
          const firstBook = loadedPlaybooks[0];
          setActivePlaybookId(firstBook.id);
          const firstForm = firstBook.formations?.[0]?.name || firstBook.plays?.[0]?.formation || "";
          setSelectedFormationName(firstForm);
          const matchingPlay = firstBook.plays?.find((p) => p.formation === firstForm) || firstBook.plays?.[0];
          if (matchingPlay) {
            setActivePlayId(matchingPlay.id);
          }
          if (isEmbedded || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "true")) {
            setViewLevel("plays");
          }
        }
      } catch (err) {
        console.error("Error loading playbooks:", err);
      }
      setLoading(false);
    };

    fetchData();
  }, [
    teamId,
    isEmbedded,
    isBlockedLeagueAdmin,
    isTeamAdminForThisTeam,
    isRosteredPlayerOnTeam,
    role,
    playerTeamId,
    managedTeamId,
  ]);

  // Active Playbook, Formation, & Play references
  const activePlaybook =
    playbooks.find((b) => b.id === activePlaybookId) || playbooks[0] || null;

  const activeFormation =
    activePlaybook?.formations.find((f) => f.name === selectedFormationName) ||
    activePlaybook?.formations[0] ||
    null;

  const effectiveFormationName = selectedFormationName || activeFormation?.name || activePlaybook?.plays?.[0]?.formation || "";

  const playsInActiveFormation = (activePlaybook?.plays || []).filter(
    (p) => p.formation === effectiveFormationName
  );

  const activePlay =
    activePlaybook?.plays.find((p) => p.id === activePlayId) ||
    playsInActiveFormation[0] ||
    activePlaybook?.plays[0] ||
    null;

  // Save Playbooks to Cloud (Firestore)
  const handleSavePlaybooks = async () => {
    if (!hasEditAccess) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(playbooks));
      }
      await setDoc(doc(db, "teams", teamId, "meta", "playbook"), {
        playbooks,
        updatedAt: new Date().toISOString(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to save playbooks:", e);
      alert("Error saving playbooks to cloud. Local changes were saved.");
    }
    setSaving(false);
  };

  // Create Playbook
  const handleCreatePlaybook = (newPlaybook: Playbook) => {
    if (!hasEditAccess) return;
    const updated = [...playbooks, newPlaybook];
    setPlaybooks(updated);
    setActivePlaybookId(newPlaybook.id);
    setSelectedFormationName("");
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(updated));
      } catch (e) {}
    }
    // Drill into the new playbook's formations view immediately
    setViewLevel("formations");
  };

  // Delete Playbook
  const handleDeletePlaybook = (bookId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!hasEditAccess) return;
    if (playbooks.length <= 1) {
      alert("A team must maintain at least one playbook.");
      return;
    }
    const bookToDelete = playbooks.find((b) => b.id === bookId);
    if (!confirm(`Are you sure you want to delete "${bookToDelete?.title}"? All formations and plays within it will be deleted.`)) {
      return;
    }
    const nextBooks = playbooks.filter((b) => b.id !== bookId);
    setPlaybooks(nextBooks);
    setActivePlaybookId(nextBooks[0].id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(nextBooks));
      } catch (e) {}
    }
  };

  // Save / Update Formation (with user-positioned players)
  const handleSaveFormation = (savedFormation: FormationAlignment) => {
    if (!activePlaybook) return;

    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === activePlaybook.id) {
          const exists = book.formations.some((f) => f.id === savedFormation.id || f.name === savedFormation.name);
          const nextFormations = exists
            ? book.formations.map((f) => (f.id === savedFormation.id || f.name === savedFormation.name ? savedFormation : f))
            : [...book.formations, savedFormation];

          // If brand new formation with 0 plays, seed 1 baseline play in this formation
          let nextPlays = book.plays;
          if (!exists) {
            const starterPlay = createPlayInFormation(book, savedFormation);
            nextPlays = [starterPlay, ...book.plays];
            setActivePlayId(starterPlay.id);
          }

          return {
            ...book,
            formations: nextFormations,
            plays: nextPlays,
            updatedAt: new Date().toISOString(),
          };
        }
        return book;
      });

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    setSelectedFormationName(savedFormation.name);
    setEditingFormation(null);
  };

  // Delete Formation
  const handleDeleteFormation = (formationName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activePlaybook) return;
    if (activePlaybook.formations.length <= 1) {
      alert("A playbook must have at least one formation.");
      return;
    }
    if (!confirm(`Are you sure you want to delete formation "${formationName}" and its plays?`)) {
      return;
    }

    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === activePlaybook.id) {
          const nextFormations = book.formations.filter((f) => f.name !== formationName);
          const nextPlays = book.plays.filter((p) => p.formation !== formationName);
          return { ...book, formations: nextFormations, plays: nextPlays };
        }
        return book;
      });

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    const remaining = activePlaybook.formations.filter((f) => f.name !== formationName);
    if (remaining.length > 0) {
      setSelectedFormationName(remaining[0].name);
    }
  };

  // Create Play in active formation
  const handleCreatePlayInFormationClick = () => {
    if (!hasEditAccess || !activePlaybook || !selectedFormationName) return;
    const targetSquad = activePlaybook.playersOnField || playersPerSide;
    const newPlay = createPlayInFormation(activePlaybook, selectedFormationName, DEFAULT_LOS_Y, targetSquad);

    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === activePlaybook.id) {
          return {
            ...book,
            plays: [newPlay, ...book.plays],
            updatedAt: new Date().toISOString(),
          };
        }
        return book;
      });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    setActivePlayId(newPlay.id);
    setViewLevel("plays");
  };

  // Update Play from Canvas edits
  const handleUpdateActivePlay = (updatedPlay: PlayDiagram) => {
    if (!hasEditAccess || !activePlaybook) return;

    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === activePlaybook.id) {
          const nextPlays = book.plays.map((p) => (p.id === updatedPlay.id ? updatedPlay : p));
          return { ...book, plays: nextPlays, updatedAt: new Date().toISOString() };
        }
        return book;
      });

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  };

  // Delete Play
  const handleDeletePlay = (idToDelete: string) => {
    if (!hasEditAccess || !activePlaybook) return;
    if (activePlaybook.plays.length <= 1) {
      alert("A playbook must have at least one play diagram.");
      return;
    }
    if (!confirm("Are you sure you want to delete this play?")) return;

    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === activePlaybook.id) {
          const nextPlays = book.plays.filter((p) => p.id !== idToDelete);
          return { ...book, plays: nextPlays };
        }
        return book;
      });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    const remainingInFormation = playsInActiveFormation.filter((p) => p.id !== idToDelete);
    if (remainingInFormation.length > 0) {
      setActivePlayId(remainingInFormation[0].id);
    } else {
      const remainingTotal = activePlaybook.plays.filter((p) => p.id !== idToDelete);
      if (remainingTotal.length > 0) setActivePlayId(remainingTotal[0].id);
    }
  };

  // Duplicate Play
  const handleDuplicatePlay = (playToClone: PlayDiagram) => {
    if (!hasEditAccess || !activePlaybook) return;
    const cloned: PlayDiagram = {
      ...playToClone,
      id: `play-${Date.now()}`,
      name: `${playToClone.name} (Copy)`,
      createdAt: new Date().toISOString(),
    };

    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === activePlaybook.id) {
          return { ...book, plays: [cloned, ...book.plays] };
        }
        return book;
      });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    setActivePlayId(cloned.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if ((!team && !isDemoMode && !isDemoTeam) || (team && !isRealTeam(team)) || teamId === "team_free_agents") {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans p-6 text-center">
        <h2 className="text-3xl font-black mb-4">Team Not Found</h2>
        <p className="text-neutral-400 mb-6 max-w-md">
          The requested franchise does not exist. Free agents are an unassigned draft pool, not a franchise.
        </p>
        <Link
          href="/teams"
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)]"
        >
          Back to Teams
        </Link>
      </div>
    );
  }

  const teamName = team?.name || "Team";
  const shortcode = team?.shortcode || getTeamShortcode(team);

  // RESTRICTION 0: League Admin Access Restriction (Strict Competitive Confidentiality Policy)
  // League admins have NO access to team playbooks
  if (isBlockedLeagueAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 text-center bg-[#0B0F19] border border-red-500/30 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10 relative z-10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="relative z-10">
              <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono font-bold uppercase tracking-wider">
                Confidentiality Policy Protected
              </span>
              <h2 className="text-2xl font-black uppercase text-white mt-3">
                League Admin Access Restricted
              </h2>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                To safeguard competitive integrity and prevent tactical advantages, League Administrators do not have access to franchise playbooks. Team playbooks, route diagrams, and schemes are strictly private to verified team coaching staff and rostered players.
              </p>
              {isDemoLeague && (
                <div className="mt-4 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 text-left">
                  <p className="font-bold text-cyan-200 mb-1">Active Role: League Commissioner</p>
                  <p className="text-neutral-300">
                    To access the Playbook Studio for {teamName}, select <strong>Team Coach ({teamName})</strong> or <strong>Rostered Athlete ({teamName})</strong> in the role bar.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 relative z-10">
              <Link
                href={`/teams/${teamId}`}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
              >
                Back to {teamName}
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
              >
                League Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RESTRICTION 1: Opponent Coach trying to access another team's playbook
  if (!isEmbedded && isOpponentCoach) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 text-center bg-[#0B0F19] border border-amber-500/30 rounded-3xl shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
                Opponent Playbook Confidential
              </span>
              <h2 className="text-2xl font-black uppercase text-white mt-3">Coach Access Restricted</h2>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                As an authorized Team Coach or Manager, you only have editing and management access to your own franchise&apos;s playbook. Opponent schemes, route designs, and gameplans are strictly protected.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              {managedTeamId && (
                <Link
                  href={`/teams/${managedTeamId}/playbook`}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
                >
                  Go to My Team&apos;s Playbook
                </Link>
              )}
              <Link
                href="/teams"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
              >
                Back to Teams
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RESTRICTION 2: Rostered player trying to view opponent's playbook
  if (!isEmbedded && isOpponentPlayer) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 text-center bg-[#0B0F19] border border-amber-500/30 rounded-3xl shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
                Opponent Playbook Protected
              </span>
              <h2 className="text-2xl font-black uppercase text-white mt-3">Tactical Playbook Confidential</h2>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                As a rostered player, you only have view access to the playbooks of your own team. Opponent team playbooks and strategic formations are strictly restricted.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href={`/teams/${playerTeamId}/playbook`}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
              >
                Go to My Team&apos;s Playbook
              </Link>
              <Link
                href="/profile"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
              >
                My Player Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RESTRICTION 3: Guest or general user without team admin/player role
  if (!isEmbedded && !canViewPlaybook) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 text-center bg-[#0B0F19] border border-cyan-500/30 rounded-3xl shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
                Protected Playbook
              </span>
              <h2 className="text-2xl font-black uppercase text-white mt-3">{teamName} Playbook Confidential</h2>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                Playbooks and strategic formations are private assets restricted to rostered players and verified coaching staff of {teamName}. Please sign in with your verified coach or player account to access this playbook.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg"
              >
                Sign In as Player / Coach
              </Link>
              <Link
                href={`/teams/${teamId}`}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
              >
                Back to {teamName}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Embedded Layout for Showcase (Directly renders PlayCanvas with compact controls)
  if (isEmbedded) {
    return (
      <div className="min-h-screen bg-black text-white font-sans p-2 sm:p-4 flex flex-col gap-3 selection:bg-cyan-500/30 selection:text-cyan-200 w-full max-w-full overflow-x-hidden">
        {/* Compact Header for Embedded Showcase */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0B0F19] p-3 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{teamName} Playbook Studio</span>
            </span>
            {activePlaybook && (
              <span className="text-xs font-bold text-neutral-400 hidden sm:inline">
                {activePlaybook.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Play Switcher Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full scrollbar-thin">
              {(activePlaybook?.plays || []).slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePlayId(p.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                    activePlay?.id === p.id
                      ? "bg-cyan-500 text-black font-black border-cyan-400 shadow-sm"
                      : "bg-white/5 text-neutral-400 hover:text-white border-white/5"
                  }`}
                >
                  {p.name.replace(/^\d+v\d+\s+/, "")}
                </button>
              ))}
            </div>

            {/* Playbook Switcher (Offense vs Defense) */}
            {playbooks.length > 1 && (
              <select
                value={activePlaybook?.id || ""}
                onChange={(e) => {
                  const book = playbooks.find((b) => b.id === e.target.value);
                  if (book) {
                    setActivePlaybookId(book.id);
                    if (book.plays.length > 0) setActivePlayId(book.plays[0].id);
                  }
                }}
                className="bg-black/60 border border-white/15 text-xs font-bold text-neutral-200 rounded-xl px-2.5 py-1 outline-none cursor-pointer"
              >
                {playbooks.map((b) => (
                  <option key={b.id} value={b.id} className="bg-neutral-900 text-white">
                    {b.type === "offense" ? "⚡ " : "🛡️ "}
                    {b.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tactical Playmaker Canvas Workspace */}
        {activePlay ? (
          <PlayCanvas
            play={activePlay}
            onChange={handleUpdateActivePlay}
            readOnly={false}
            playbook={activePlaybook}
          />
        ) : (
          <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-12 text-center text-neutral-400">
            <BookOpen className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
            <h3 className="text-xl font-bold uppercase text-white mb-2">Loading Playbook Studio...</h3>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative flex flex-col">

      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-[40rem] h-[40rem] bg-cyan-950/20 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-20 right-10 w-[35rem] h-[35rem] bg-blue-950/25 rounded-full blur-[180px]"></div>
      </div>

      <div className={`max-w-7xl mx-auto ${isEmbedded ? "space-y-3 p-2 sm:p-3" : "space-y-6 p-4 sm:p-6 md:p-8"} relative z-10 flex-1 w-full`}>
        {/* ============================================================== */}
        {/* 1. TOP HEADER & BREADCRUMBS (DYNAMIC FOR ALL 3 DRILLDOWN LEVELS)*/}
        {/* ============================================================== */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 ${isEmbedded ? "pb-2.5" : "pb-5"}`}>
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {!isEmbedded ? (
                <Link
                  href={`/teams/${teamId}`}
                  className="inline-flex items-center text-neutral-400 hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-full border border-white/10 text-xs font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  <span>{teamName} Portal</span>
                </Link>
              ) : (
                <span className="inline-flex items-center text-cyan-300 bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/30 text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  <span>{teamName} Studio</span>
                </span>
              )}

              {viewLevel !== "playbooks" && (
                <>
                  <span className="text-xs text-neutral-500">•</span>
                  <button
                    onClick={() => setViewLevel("playbooks")}
                    className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                  >
                    Playbooks
                  </button>
                </>
              )}

              {viewLevel === "plays" && activePlaybook && (
                <>
                  <span className="text-xs text-neutral-500">•</span>
                  <button
                    onClick={() => setViewLevel("formations")}
                    className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                  >
                    {activePlaybook.title}
                  </button>
                </>
              )}

              <span className="text-xs text-neutral-500">•</span>

              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase text-cyan-300">
                {(activePlaybook?.playersOnField || playersPerSide)}v{(activePlaybook?.playersOnField || playersPerSide)} Flag Format
              </span>

              {isRosteredPlayerOnTeam && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase text-emerald-300 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Player View Only</span>
                </span>
              )}
            </div>

            {/* Level 1 Title: "{Team Name}'s PlayBooks" */}
            {viewLevel === "playbooks" && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--league-primary)] to-[var(--league-accent)] flex items-center justify-center text-white shadow-lg p-1.5">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                    {teamName}&apos;s <span className="text-cyan-400">PlayBooks</span>
                  </h1>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Select a playbook to manage custom formations and design plays. Up to {MAX_PLAYBOOKS_PER_TEAM} playbooks.
                  </p>
                </div>
              </div>
            )}

            {/* Level 2 Title: Playbook Formations Dashboard */}
            {viewLevel === "formations" && activePlaybook && (
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg p-1.5 ${
                    activePlaybook.type === "offense"
                      ? "bg-gradient-to-tr from-cyan-600 to-blue-600"
                      : "bg-gradient-to-tr from-purple-600 to-indigo-600"
                  }`}
                >
                  {activePlaybook.type === "offense" ? (
                    <Zap className="w-5 h-5 text-white" />
                  ) : (
                    <Shield className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                      {activePlaybook.title}
                    </h1>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                        activePlaybook.type === "offense"
                          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                          : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      }`}
                    >
                      {activePlaybook.type === "offense" ? "Offense" : "Defense"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Formations & Alignments • Click a formation to see all plays inside it.
                  </p>
                </div>
              </div>
            )}

            {/* Level 3 Title: Plays in Selected Formation */}
            {viewLevel === "plays" && activePlaybook && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center text-white p-1.5">
                  <Layers className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                      {selectedFormationName}
                    </h1>
                    <span className="text-xs font-mono text-neutral-400 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      {playsInActiveFormation.length} Plays
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {activePlaybook.title} • Tactical route & scheme designer
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            {/* Level 1: "+ Create Playbook" */}
            {viewLevel === "playbooks" && hasEditAccess && (
              <button
                type="button"
                disabled={playbooks.length >= MAX_PLAYBOOKS_PER_TEAM}
                onClick={() => setIsCreatePlaybookOpen(true)}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                  playbooks.length < MAX_PLAYBOOKS_PER_TEAM
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan-500/20"
                    : "bg-white/5 text-neutral-500 border border-white/10 cursor-not-allowed"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Create a Playbook</span>
              </button>
            )}

            {/* Level 2: "+ Create Formation" */}
            {viewLevel === "formations" && hasEditAccess && (
              <button
                type="button"
                onClick={() => {
                  setEditingFormation(null);
                  setIsFormationModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Formation</span>
              </button>
            )}

            {/* Level 3: "+ Create Play in Formation" */}
            {viewLevel === "plays" && hasEditAccess && (
              <button
                type="button"
                onClick={handleCreatePlayInFormationClick}
                className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>New Play in {selectedFormationName}</span>
              </button>
            )}

            {/* Print Armbands (Available for both Coaches and Rostered Athletes) */}
            {(viewLevel === "formations" || viewLevel === "plays") && canViewPlaybook && (
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>Print Armbands</span>
              </button>
            )}

            {/* Save to Cloud Button */}
            {hasEditAccess && (
              <button
                onClick={handleSavePlaybooks}
                disabled={saving}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 ${
                  saveSuccess
                    ? "bg-emerald-500 text-black shadow-emerald-500/25"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Save to Cloud"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* LEVEL 1: "{TEAM NAME}'S PLAYBOOKS" CARDS DASHBOARD            */}
        {/* ============================================================== */}
        {viewLevel === "playbooks" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
                Existing Playbooks ({playbooks.length}/{MAX_PLAYBOOKS_PER_TEAM}):
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {playbooks.map((book) => {
                const isOffense = book.type === "offense";
                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      setActivePlaybookId(book.id);
                      if (book.formations.length > 0) {
                        setSelectedFormationName(book.formations[0].name);
                      }
                      setViewLevel("formations");
                    }}
                    className="bg-[#0B0F19] hover:bg-[#0E1424] border border-white/10 hover:border-cyan-500/50 rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xl hover:shadow-cyan-500/10 group space-y-5"
                  >
                    <div>
                      {/* Card Header & Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                              isOffense
                                ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                                : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                            }`}
                          >
                            {isOffense ? <Zap className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                            <span>{isOffense ? "Offensive Playbook" : "Defensive Playbook"}</span>
                          </span>

                          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase bg-white/5 border border-white/10 text-neutral-300">
                            {book.playersOnField || playersPerSide}v{book.playersOnField || playersPerSide}
                          </span>
                        </div>

                        {hasEditAccess && playbooks.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeletePlaybook(book.id, e)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                            title="Delete playbook"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <h3 className="text-xl font-black uppercase text-white group-hover:text-cyan-400 transition-colors">
                        {book.title}
                      </h3>

                      {book.description && (
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                          {book.description}
                        </p>
                      )}
                    </div>

                    {/* Formations pills preview */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold block">
                        Formations Created:
                      </span>
                      {book.formations.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {book.formations.slice(0, 4).map((f) => (
                            <span
                              key={f.id}
                              className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[11px] font-mono text-neutral-300"
                            >
                              {f.name}
                            </span>
                          ))}
                          {book.formations.length > 4 && (
                            <span className="text-[10px] font-mono text-neutral-500 self-center">
                              +{book.formations.length - 4} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-500 italic block">No formations created yet</span>
                      )}
                    </div>

                    {/* Stats & Open CTA */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
                        <span><strong>{book.formations.length}</strong> Formations</span>
                        <span>•</span>
                        <span><strong>{book.plays.length}</strong> Plays</span>
                      </div>

                      <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* LEVEL 2: FORMATIONS CARDS DASHBOARD (WITH PRE-SNAP SPOTS)       */}
        {/* ============================================================== */}
        {viewLevel === "formations" && activePlaybook && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F19] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewLevel("playbooks")}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>All Playbooks</span>
                </button>
                <span className="text-xs text-neutral-500">•</span>
                <span className="text-xs font-mono text-neutral-300">
                  Formations in <strong className="text-white">{activePlaybook.title}</strong> ({activePlaybook.formations.length})
                </span>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowOpposingSide(!showOpposingSide)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    showOpposingSide
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                  title={
                    showOpposingSide
                      ? `Hide opposing ${activePlaybook.type === "offense" ? "defense" : "offense"}`
                      : `Show opposing ${activePlaybook.type === "offense" ? "defense" : "offense"}`
                  }
                >
                  {showOpposingSide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>
                    {showOpposingSide
                      ? `Hide Opposing ${activePlaybook.type === "offense" ? "Defense" : "Offense"}`
                      : `Show Opposing ${activePlaybook.type === "offense" ? "Defense" : "Offense"}`}
                  </span>
                </button>

                {hasEditAccess && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFormation(null);
                      setIsFormationModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Formation</span>
                  </button>
                )}
              </div>
            </div>

            {activePlaybook.formations.length === 0 ? (
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-12 text-center text-neutral-400">
                <Layers className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                <h3 className="text-xl font-bold uppercase text-white mb-2">No Formations Created Yet</h3>
                <p className="text-xs max-w-md mx-auto mb-6">
                  In Flag Football, plays are built out of formations. Create your first formation by placing your {activePlaybook.playersOnField || playersPerSide} players in their exact pre-snap alignment.
                </p>
                {hasEditAccess && (
                  <button
                    onClick={() => {
                      setEditingFormation(null);
                      setIsFormationModalOpen(true);
                    }}
                    className="px-6 py-3 rounded-2xl bg-cyan-500 text-black font-bold text-xs uppercase tracking-wider"
                  >
                    Place Players in Formation
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activePlaybook.formations.map((formation) => {
                  const playsCount = activePlaybook.plays.filter((p) => p.formation === formation.name).length;
                  // Construct preview play with no routes to show clean formation spots
                  const previewPlay: PlayDiagram = {
                    id: `preview-${formation.id}`,
                    teamId,
                    name: formation.name,
                    type: activePlaybook.type,
                    formation: formation.name,
                    situation: "Standard",
                    losY: DEFAULT_LOS_Y,
                    players: (formation.players && formation.players.length > 0
                      ? formation.players
                      : activePlaybook.plays.find((p) => p.formation === formation.name)?.players ||
                        ensureSquadMatchup([], DEFAULT_LOS_Y, activePlaybook.playersOnField || playersPerSide)
                    ).map((p) => ({ ...p, route: [] })),
                  };

                  return (
                    <div
                      key={formation.id}
                      onClick={() => {
                        setSelectedFormationName(formation.name);
                        const firstInForm = activePlaybook.plays.find((p) => p.formation === formation.name);
                        if (firstInForm) setActivePlayId(firstInForm.id);
                        setViewLevel("plays");
                      }}
                      className="bg-[#0B0F19] hover:bg-[#0E1424] border border-white/10 hover:border-cyan-500/50 rounded-3xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xl group space-y-4"
                    >
                      {/* Formation Card Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-black uppercase text-white group-hover:text-cyan-400 transition-colors">
                            {formation.name}
                          </h3>
                          <span className="text-[11px] font-mono text-neutral-400">
                            {playsCount} {playsCount === 1 ? "Play" : "Plays"} Created
                          </span>
                        </div>

                        {hasEditAccess && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFormation(formation);
                                setIsFormationModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
                              title="Edit player alignment spots"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {activePlaybook.formations.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteFormation(formation.name, e)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-white/10"
                                title="Delete formation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Scaled Pre-Snap Alignment Field View */}
                      <div className="w-full aspect-[16/10] bg-[#102319] rounded-2xl border border-white/10 overflow-hidden shadow-inner group-hover:border-cyan-500/30 transition-colors">
                        <MiniPlayDiagram play={previewPlay} theme="dark" showLabels={true} showOpposingSide={showOpposingSide} />
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs font-mono text-neutral-400">
                          Pre-Snap Alignment
                        </span>

                        <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>See Plays ({playsCount})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* LEVEL 3: PLAYS WITHIN FORMATION & INTERACTIVE CANVAS EDITOR    */}
        {/* ============================================================== */}
        {viewLevel === "plays" && activePlaybook && (
          <div className="space-y-6">
            {/* Navigation & Formation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F19] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewLevel("formations")}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Formations</span>
                </button>
                <span className="text-xs text-neutral-500">•</span>
                <span className="text-xs font-mono text-neutral-300">
                  Formation: <strong className="text-cyan-400">{selectedFormationName}</strong> ({playsInActiveFormation.length} Plays)
                </span>
              </div>

              {/* Quick formation switcher within this playbook */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1 hidden sm:inline">
                  Switch Formation:
                </span>
                {activePlaybook.formations.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFormationName(f.name);
                      const firstPlay = activePlaybook.plays.find((p) => p.formation === f.name);
                      if (firstPlay) setActivePlayId(firstPlay.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                      selectedFormationName === f.name
                        ? "bg-cyan-500 text-black border-cyan-400 shadow-sm"
                        : "bg-black/50 text-neutral-400 border-white/5 hover:text-white"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal Play Scroller Tape for this formation */}
            {playsInActiveFormation.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-400 font-bold">
                    Plays in {selectedFormationName}:
                  </span>
                  {hasEditAccess && (
                    <button
                      onClick={handleCreatePlayInFormationClick}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Play</span>
                    </button>
                  )}
                </div>

                <div className={`flex gap-2.5 overflow-x-auto ${isEmbedded ? "pb-1" : "pb-2"} scrollbar-thin`}>
                  {playsInActiveFormation.map((p) => {
                    const isSelected = activePlayId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActivePlayId(p.id)}
                        className={`flex items-center justify-between gap-2.5 ${isEmbedded ? "px-3 py-2 min-w-[170px]" : "px-4 py-3 min-w-[210px]"} rounded-2xl border transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10"
                            : "bg-[#0B0F19] border-white/10 text-neutral-300 hover:border-white/20"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <span className="text-[10px] text-neutral-400 block mb-0.5">{p.situation}</span>
                          <h4 className="text-xs font-black uppercase truncate">{p.name}</h4>
                        </div>

                        {hasEditAccess && isSelected && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicatePlay(p);
                              }}
                              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
                              title="Duplicate Play"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {playsInActiveFormation.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePlay(p.id);
                                }}
                                className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-white/10"
                                title="Delete Play"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tactical Playmaker Canvas Workspace */}
            {activePlay ? (
              <PlayCanvas
                play={activePlay}
                onChange={handleUpdateActivePlay}
                readOnly={!hasEditAccess}
                playbook={activePlaybook}
              />
            ) : (
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-12 text-center text-neutral-400">
                <BookOpen className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                <h3 className="text-xl font-bold uppercase text-white mb-2">No Plays in this Formation</h3>
                <p className="text-xs max-w-sm mx-auto mb-6">
                  Create a new offensive or defensive play diagram designed for this formation.
                </p>
                {hasEditAccess && (
                  <button
                    onClick={handleCreatePlayInFormationClick}
                    className="px-6 py-3 rounded-2xl bg-cyan-500 text-black font-bold text-xs uppercase"
                  >
                    Create Play in {selectedFormationName}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Create Playbook */}
      <CreatePlaybookModal
        isOpen={isCreatePlaybookOpen}
        onClose={() => setIsCreatePlaybookOpen(false)}
        teamId={teamId}
        currentPlaybookCount={playbooks.length}
        onCreate={handleCreatePlaybook}
        defaultPlayersOnField={playersPerSide}
      />

      {/* MODAL 2: Create / Edit Formation (with visual drag placement) */}
      {activePlaybook && (
        <CreateFormationModal
          isOpen={isFormationModalOpen}
          onClose={() => {
            setIsFormationModalOpen(false);
            setEditingFormation(null);
          }}
          playbook={activePlaybook}
          initialFormation={editingFormation}
          onSaveFormation={handleSaveFormation}
        />
      )}

      {/* MODAL 3: Print Armbands / Playbook / Call Sheets */}
      {activePlaybook && (
        <PrintArmbandModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          playbook={activePlaybook}
          teamName={teamName}
        />
      )}

    </div>
  );
}
