"use client";

import { use, useEffect, useState, useRef } from "react";
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
  RefreshCw,
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
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { createSecureRecord } from "@/lib/secureWrites";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import { FlagOSText } from "@/components/FlagOSText";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import dynamic from "next/dynamic";
const PlayCanvas = dynamic(() => import("@/components/playbook/PlayCanvas"));
import CreatePlaybookModal from "@/components/playbook/CreatePlaybookModal";
import EditPlaybookModal from "@/components/playbook/EditPlaybookModal";
import CreateFormationModal from "@/components/playbook/CreateFormationModal";
import PrintArmbandModal from "@/components/playbook/PrintArmbandModal";
import PlayQuestionsModal from "@/components/playbook/PlayQuestionsModal";
import MiniPlayDiagram from "@/components/playbook/MiniPlayDiagram";
import { usePageGuide } from "@/lib/pageGuide";
import { PLAYBOOK_STUDIO_WALKTHROUGH } from "@/lib/walkthroughData";
import {
  Playbook,
  PlayDiagram,
  PlayQuestion,
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
import { requestPrivateData } from "@/lib/secureWrites";
import { isPrimaryTeamAdmin, isDexterUser } from "@/lib/teamAdminRbac";
import { resolveTeamColorPalette, getReadableTextColor } from "@/lib/teamColors";
import { useTeamColors } from "@/lib/teamColorContext";
import { isDemoTeamId } from "@/lib/demoSandboxRuntime";
import TeamNavBar from "@/components/team/TeamNavBar";
import TeamPortalFooter from "@/components/team/TeamPortalFooter";

type PlaybookViewLevel = "playbooks" | "formations" | "plays" | "editor";

export default function TeamPlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  usePageGuide(PLAYBOOK_STUDIO_WALKTHROUGH);
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;

  const { canManageTeam, isPlayer, playerTeamId, isLeagueAdmin, isTeamAdmin, managedTeamId, user, userProfile, playerData, loading: authLoading } = useAuth();
  const { settings, isDemoLeague } = useLeague();
  const { isDenied, deniedElement } = usePrivateLeagueAccess();
  const playersPerSide = settings?.rules?.playersOnField || 5;

  const { palette: contextPalette, team: contextTeam } = useTeamColors();
  const [team, setTeam] = useState<any>(null);
  const effectiveTeam = team || contextTeam;
  const palette = resolveTeamColorPalette(effectiveTeam || contextPalette);
  const isDexter = isDexterUser(user?.email);
  // Admin emails are private, so the head-coach check reads them from team_private.
  const [privateTeam, setPrivateTeam] = useState<{ adminEmails?: string[]; coachEmail?: string } | null>(null);
  const isPrimary = isPrimaryTeamAdmin(user?.email, { ...(team || {}), ...(privateTeam || {}) }, isDexter);
  const canDeletePlaybook = isPrimary;
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [activePlaybookId, setActivePlaybookId] = useState<string>("");
  const [selectedFormationName, setSelectedFormationName] = useState<string>("");
  const [activePlayId, setActivePlayId] = useState<string>("");
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);

  const isDemoTeam = isDemoTeamId(teamId);

  const [demoRequested, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("demo") === "true" || sp.get("embed") === "true" || isDemoTeam || sessionStorage.getItem("flagos_demo_active") === "true";
    }
    return isDemoTeam;
  });

  const [embeddedRequested, setIsEmbedded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("embed") === "true";
    }
    return false;
  });

  const isDemoMode = isDemoTeam && demoRequested;
  const isEmbedded = isDemoTeam && embeddedRequested;

  // Embedded demos and existing studio links open directly in the editor.
  const [viewLevel, setViewLevel] = useState<PlaybookViewLevel>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true" || sp.get("level") === "plays") {
        return "editor";
      }
    }
    return "playbooks";
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-Save State: collapses rapid edits into a 2.5s debounced write to keep DB writes low
  type AutoSaveState = "saved" | "saving" | "unsaved" | "offline";
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveState>("saved");
  const lastSavedSnapshotRef = useRef<string>("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadDoneRef = useRef<boolean>(false);

  // Modals
  const [isCreatePlaybookOpen, setIsCreatePlaybookOpen] = useState(false);
  const [isEditPlaybookOpen, setIsEditPlaybookOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
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
        setViewLevel("editor");
      }
    }
  }, [teamId, isDemoTeam, isDemoLeague]);

  const isEffectDemo = isDemoTeam;

  // Strict Playbook RBAC:
  // 1. League admins have NO access to customer team playbooks (competitive integrity & strategic confidentiality policy)
  // 2. Authorized team admins can EDIT playbooks for their team only
  // 3. Players strictly have VIEW-ONLY access to their team: players CANNOT edit plays, formations, or playbooks,
  //    but CAN post questions for their coach on individual plays.
  // 4. Opponent coaches, opponent players, spectators, and unauthenticated users have NO access
  // Note: isEmbedded allows the interactive showcase on the marketing landing page (/page.tsx) to demo the studio
  const isTeamAdminForThisTeam = isTeamAdmin(teamId);
  const isRosteredPlayerOnTeam = isPlayer && playerTeamId === teamId;
  const isOpponentCoach = isTeamAdmin() && !isTeamAdminForThisTeam;
  const isOpponentPlayer = isPlayer && !isRosteredPlayerOnTeam;

  // League admins are strictly forbidden from viewing or modifying customer playbooks,
  // unless they are explicitly listed as an admin of this team.
  // The server-verified identity lookup lists the teams this account coaches; team_private admin emails confirm it.
  const isListedTeamAdmin = userProfile?.managedTeamId === teamId || !!userProfile?.managedTeamIds?.includes(teamId) ||
    (!!user?.email && Array.isArray(team?.adminEmails) && team.adminEmails.some((e: string) => String(e).trim().toLowerCase() === user.email!.trim().toLowerCase()));
  const isBlockedLeagueAdmin = !isEmbedded && isLeagueAdmin && !isListedTeamAdmin;

  // Edit access: strictly team admins/coaches of THIS team (or embedded marketing demo).
  // Players strictly have VIEW-ONLY permissions (no editing plays, formations, or routes).
  const hasEditAccess = !isBlockedLeagueAdmin && !isPlayer && (isEmbedded || isTeamAdminForThisTeam);

  // View access: team admins of THIS team OR rostered players of THIS team
  const canViewPlaybook = !isBlockedLeagueAdmin && (isEmbedded || isTeamAdminForThisTeam || isRosteredPlayerOnTeam);

  // Warm the editor chunk while the playbook list loads so opening a play is instant.
  useEffect(() => {
    void import("@/components/playbook/PlayCanvas");
  }, []);

  const loadedPlaybooksKeyRef = useRef<string | null>(null);
  const fetchGenerationRef = useRef(0);
  const activePlaybookIdRef = useRef(activePlaybookId);
  useEffect(() => {
    activePlaybookIdRef.current = activePlaybookId;
  }, [activePlaybookId]);
  const hasPlaybookAccess = isEmbedded || (!isBlockedLeagueAdmin && (isTeamAdminForThisTeam || isRosteredPlayerOnTeam));

  const canLoadPrivateTeam = !isEmbedded && !isEffectDemo && hasEditAccess;
  useEffect(() => {
    setPrivateTeam(null);
    if (!canLoadPrivateTeam) return;
    let cancelled = false;
    requestPrivateData<{ team: { adminEmails?: string[]; coachEmail?: string } }>("team", { teamId })
      .then((data) => { if (!cancelled) setPrivateTeam(data.team); })
      .catch((error: unknown) => console.warn("Unable to load private team settings:", error));
    return () => { cancelled = true; };
  }, [teamId, canLoadPrivateTeam, user?.uid]);

  // 1. Fetch Team & Playbooks from Firestore / LocalStorage
  useEffect(() => {
    const loadKey = `${teamId}|${isEmbedded}`;

    const resolveSandboxTeam = (fallbackName?: string, fallbackShortcode?: string) => {
      const sTeam = getSandboxTeams().find((t) => t.id === teamId || (isEmbedded && teamId === "team_apex" && t.id === "team_kc"));
      if (sTeam) return { ...sTeam, id: sTeam.id, name: sTeam.name, shortcode: (sTeam as any).shortcode || getTeamShortcode(sTeam) };
      return fallbackName ? { id: teamId, name: fallbackName, shortcode: fallbackShortcode } : null;
    };

    const loadTeam = async () => {
      if (isEmbedded) return resolveSandboxTeam("Kansas City", "KC");
      try {
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (teamSnap.exists()) {
          const tData = { id: teamSnap.id, ...(teamSnap.data() as any) };
          return isRealTeam(tData) ? tData : null;
        }
        return isEffectDemo ? resolveSandboxTeam("Apex Predators", "APX") : null;
      } catch (e) {
        console.warn("Unable to fetch live team from Firestore:", e);
        return resolveSandboxTeam();
      }
    };

    const loadRemotePlaybooks = async (): Promise<Playbook[] | null> => {
      if (isEmbedded) return null;
      try {
        const playbookDocSnap = await getDoc(doc(db, "teams", teamId, "meta", "playbook"));
        if (!playbookDocSnap.exists()) return null;
        const data = playbookDocSnap.data();
        if (data?.playbooks && Array.isArray(data.playbooks)) return data.playbooks;
        if (data?.plays && Array.isArray(data.plays)) return migrateRawPlaysToPlaybooks(data.plays, teamId);
      } catch (e) {
        console.warn("Unable to fetch live playbook from Firestore:", e);
      }
      return null;
    };

    const readCachedPlaybooks = (): Playbook[] | null => {
      if (typeof window === "undefined") return null;
      const cachedPlaybooks = localStorage.getItem(`flagos_playbooks_${teamId}`);
      if (cachedPlaybooks) {
        try {
          const parsed = JSON.parse(cachedPlaybooks);
          return Array.isArray(parsed) ? parsed : null;
        } catch {}
        return null;
      }
      const legacyCached = localStorage.getItem(`flagos_playbook_${teamId}`);
      if (legacyCached) {
        try {
          return migrateRawPlaysToPlaybooks(JSON.parse(legacyCached), teamId);
        } catch {}
      }
      return null;
    };

    const normalizePlaybooks = (source: Playbook[] | null): Playbook[] => {
      if (source !== null) {
        return source.map((book) => {
          const bookSquad = book.playersOnField || playersPerSide;
          return {
            ...book,
            playersOnField: bookSquad,
            formations: book.formations || [],
            plays: (book.plays || []).map((p) => ({
              ...p,
              players: ensureSquadMatchup(p.players || [], p.losY || DEFAULT_LOS_Y, bookSquad),
            })),
          };
        });
      }
      if (isEmbedded) {
        return createDefaultPlaybooks(teamId, playersPerSide);
      }
      return [];
    };

    const selectFirstPlay = (books: Playbook[]) => {
      if (!books || books.length === 0) {
        setActivePlaybookId("");
        setSelectedFormationName("");
        setActivePlayId("");
        setViewLevel("playbooks");
        return;
      }
      const firstBook = books[0];
      setActivePlaybookId(firstBook.id);
      const firstForm = firstBook.formations?.[0]?.name || firstBook.plays?.[0]?.formation || "";
      setSelectedFormationName(firstForm);
      const matchingPlay = firstBook.plays?.find((p) => p.formation === firstForm) || firstBook.plays?.[0];
      if (matchingPlay) {
        setActivePlayId(matchingPlay.id);
      } else {
        setActivePlayId("");
      }
      if (isEmbedded) {
        setViewLevel("editor");
      }
    };

    const fetchData = async () => {
      // Playbooks for this team are already loading/loaded for an authorized viewer; auth
      // revalidation or team metadata updates should not refetch or reset the editor.
      if (loadedPlaybooksKeyRef.current === loadKey && hasPlaybookAccess) return;

      // Hold the spinner while auth resolves instead of flashing an access-denied screen.
      if (!hasPlaybookAccess && authLoading) return;

      const generation = ++fetchGenerationRef.current;
      const isStale = () => generation !== fetchGenerationRef.current;
      loadedPlaybooksKeyRef.current = hasPlaybookAccess ? loadKey : null;

      // Team and playbook documents are independent reads: fetch them in parallel.
      const teamPromise = loadTeam();
      const remotePromise = hasPlaybookAccess ? loadRemotePlaybooks() : Promise.resolve(null);

      let paintedSnapshot: string | null = null;
      if (hasPlaybookAccess && !isEmbedded) {
        const cached = readCachedPlaybooks();
        if (cached) {
          const books = normalizePlaybooks(cached);
          paintedSnapshot = JSON.stringify(books);
          setPlaybooks(books);
          selectFirstPlay(books);
          setLoading(false);
        }
      }

      try {
        const loadedTeam = await teamPromise;
        if (isStale()) return;
        if (loadedTeam) setTeam(loadedTeam);

        // League admins are only allowed through once the team doc confirms they're a listed admin.
        if (!hasPlaybookAccess) {
          setLoading(false);
          return;
        }

        const remote = await remotePromise;
        if (isStale()) return;

        const sourcePlaybooks = remote !== null ? remote : readCachedPlaybooks();
        const loadedPlaybooks = normalizePlaybooks(sourcePlaybooks);
        const loadedSnapshot = JSON.stringify(loadedPlaybooks);

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`flagos_playbooks_${teamId}`, loadedSnapshot);
          } catch {}
        }

        lastSavedSnapshotRef.current = loadedSnapshot;
        if (paintedSnapshot === null) {
          setPlaybooks(loadedPlaybooks);
          selectFirstPlay(loadedPlaybooks);
        } else if (paintedSnapshot !== loadedSnapshot) {
          setPlaybooks((current) => {
            // Keep edits made against the cached copy; auto-save will sync them.
            if (JSON.stringify(current) !== paintedSnapshot) return [...current];
            return loadedPlaybooks;
          });
          if (!loadedPlaybooks.some((b) => b.id === activePlaybookIdRef.current)) {
            selectFirstPlay(loadedPlaybooks);
          }
        }
        isInitialLoadDoneRef.current = true;
        loadedPlaybooksKeyRef.current = loadKey;
        setAutoSaveStatus("saved");
      } catch (err) {
        console.error("Error loading playbooks:", err);
      }
      if (!isStale()) setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, isEmbedded, hasPlaybookAccess, authLoading]);
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

  // Flush pending auto-save immediately to Cloud (Firestore)
  const flushAutoSave = async () => {
    if (!hasEditAccess || isEmbedded || loading) return;
    const currentSnapshot = JSON.stringify(playbooks);
    if (currentSnapshot === lastSavedSnapshotRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setAutoSaveStatus("saving");
    setSaving(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`flagos_playbooks_${teamId}`, currentSnapshot);
      }
      await createSecureRecord("playbook", {
        teamId,
        playbooks,
        updatedAt: new Date().toISOString(),
      });
      lastSavedSnapshotRef.current = currentSnapshot;
      setAutoSaveStatus("saved");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.warn("Auto-save to cloud failed, saved locally:", e);
      setAutoSaveStatus("offline");
    }
    setSaving(false);
  };

  // Debounced Auto-Saver: persists immediately to localStorage, and syncs
  // to Firestore after 2.5s of idle time. Eliminates high DB write volume.
  useEffect(() => {
    if (loading || !hasEditAccess || isEmbedded || !isInitialLoadDoneRef.current) return;

    const currentSnapshot = JSON.stringify(playbooks);
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    setAutoSaveStatus("unsaved");

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus("saving");
        await createSecureRecord("playbook", {
          teamId,
          playbooks,
          updatedAt: new Date().toISOString(),
        });
        lastSavedSnapshotRef.current = currentSnapshot;
        setAutoSaveStatus("saved");
      } catch (err) {
        console.warn("Auto-save to cloud failed, saved locally:", err);
        setAutoSaveStatus("offline");
      }
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [playbooks, loading, hasEditAccess, isEmbedded, teamId]);

  // Flush pending auto-save when leaving or closing page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lastSavedSnapshotRef.current !== JSON.stringify(playbooks)) {
        flushAutoSave();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [playbooks]);

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

  // Update Playbook Details (title, unit type, squad format, description)
  const handleUpdatePlaybook = (updatedPlaybook: Playbook) => {
    if (!hasEditAccess) return;
    const next = playbooks.map((b) => (b.id === updatedPlaybook.id ? updatedPlaybook : b));
    setPlaybooks(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(next));
      } catch (e) {}
    }
    setIsEditPlaybookOpen(false);
    setEditingPlaybook(null);
  };

  // Delete Playbook
  const handleDeletePlaybook = (bookId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canDeletePlaybook) {
      alert("Permission Denied: Only the primary team admin (head coach) can delete playbooks.");
      return;
    }
    if (!hasEditAccess) return;
    const bookToDelete = playbooks.find((b) => b.id === bookId);
    if (!confirm(`Are you sure you want to delete "${bookToDelete?.title || "this playbook"}"? All formations and plays within it will be deleted.`)) {
      return;
    }
    const nextBooks = playbooks.filter((b) => b.id !== bookId);
    setPlaybooks(nextBooks);
    if (nextBooks.length > 0) {
      setActivePlaybookId(nextBooks[0].id);
      const firstForm = nextBooks[0].formations?.[0]?.name || "";
      setSelectedFormationName(firstForm);
      const matchingPlay = nextBooks[0].plays?.find((p) => p.formation === firstForm) || nextBooks[0].plays?.[0];
      setActivePlayId(matchingPlay?.id || "");
    } else {
      setActivePlaybookId("");
      setSelectedFormationName("");
      setActivePlayId("");
      setViewLevel("playbooks");
    }
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

          return {
            ...book,
            formations: nextFormations,
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
    if (!confirm(`Are you sure you want to delete formation "${formationName}" and its plays?`)) {
      return;
    }

    const nextFormations = activePlaybook.formations.filter((f) => f.name !== formationName);
    const nextPlays = activePlaybook.plays.filter((p) => p.formation !== formationName);

    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === activePlaybook.id) {
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

    if (nextFormations.length > 0) {
      setSelectedFormationName(nextFormations[0].name);
      const remainingPlay = nextPlays.find((p) => p.formation === nextFormations[0].name) || nextPlays[0];
      setActivePlayId(remainingPlay?.id || "");
    } else {
      setSelectedFormationName("");
      setActivePlayId("");
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
    setViewLevel("editor");
  };

  // Update Play from Canvas edits
  const handleUpdateActivePlay = (updatedPlay: PlayDiagram) => {
    if (!hasEditAccess || !activePlaybook) return;

    if (viewLevel === "editor" && activePlay?.id === updatedPlay.id && activePlay.formation !== updatedPlay.formation) {
      setSelectedFormationName(updatedPlay.formation);
    }
    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        if (book.id === activePlaybook.id) {
          const nextPlays = book.plays.map((p) => (p.id === updatedPlay.id ? updatedPlay : p));
          const nextFormations = book.formations.some((formation) => formation.name === updatedPlay.formation)
            ? book.formations
            : [...book.formations, {
              id: `formation-${crypto.randomUUID()}`,
              name: updatedPlay.formation,
              side: book.type,
            }];
          return { ...book, formations: nextFormations, plays: nextPlays, updatedAt: new Date().toISOString() };
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

  // Current user metadata for play Q&A author attribution
  const currentUserForQuestions = {
    name: playerData?.name || user?.displayName || (isPlayer ? "Rostered Player" : "Coach"),
    email: user?.email || undefined,
    jerseyNumber: playerData?.number || playerData?.jerseyNumber || undefined,
    role: isPlayer ? "player" : hasEditAccess ? "coach" : "staff",
  };

  // Update play questions (accessible to rostered players and coaches)
  const handleUpdateActivePlayQuestions = (updatedQuestions: PlayQuestion[]) => {
    if (!activePlay) return;
    const playId = activePlay.id;

    setPlaybooks((prev) => {
      const next = prev.map((book) => {
        const hasPlay = book.plays.some((p) => p.id === playId);
        if (!hasPlay) return book;
        return {
          ...book,
          plays: book.plays.map((p) => (p.id === playId ? { ...p, questions: updatedQuestions } : p)),
          updatedAt: new Date().toISOString(),
        };
      });

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`flagos_playbooks_${teamId}`, JSON.stringify(next));
        } catch (e) {}
      }

      void createSecureRecord("playbook", {
        teamId,
        playbooks: next,
        updatedAt: new Date().toISOString(),
      }).catch((error) => console.error("Could not save questions to Firestore:", error));

      return next;
    });
  };

  // Delete Play
  const handleDeletePlay = (idToDelete: string) => {
    if (!hasEditAccess || !activePlaybook) return;
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
      if (remainingTotal.length > 0) {
        setActivePlayId(remainingTotal[0].id);
      } else {
        setActivePlayId("");
        if (viewLevel === "editor") {
          setViewLevel("plays");
        }
      }
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

  if (isDenied) {
    return deniedElement;
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading playbook" className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans">
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
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500  font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)]"
          style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
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
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-[var(--team-ink)]">
        <TeamNavBar teamId={teamId} />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 text-center bg-[#0B0F19] border border-red-500/30 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10 relative z-10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="relative z-10">
              <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono font-bold uppercase tracking-wider">
                Private Team Playbook
              </span>
              <h2 className="text-2xl font-black uppercase text-white mt-3">
                League Admin Access Restricted
              </h2>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                To safeguard competitive integrity and prevent tactical advantages, League Administrators do not have access to franchise playbooks. Team playbooks, route diagrams, and schemes are strictly private to verified team coaching staff and rostered players.
              </p>
              {isDemoLeague && (
                <div className="mt-4 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-[var(--team-ink)] text-left">
                  <p className="font-bold text-[var(--team-ink)] mb-1">Active Role: League Commissioner</p>
                  <p className="text-neutral-300">
                    To access the Playbook for {teamName}, select <strong>Team Coach ({teamName})</strong> or <strong>Rostered Athlete ({teamName})</strong> in the role bar.
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
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
                style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
              >
                League Home
              </Link>
            </div>
          </div>
        </div>
        <TeamPortalFooter section="Team Playbook" />
      </div>
    );
  }

  // RESTRICTION 1: Opponent Coach trying to access another team's playbook
  if (!isEmbedded && isOpponentCoach) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-[var(--team-ink)]">
        <TeamNavBar teamId={teamId} />
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
                  style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
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
        <TeamPortalFooter section="Team Playbook" />
      </div>
    );
  }

  // RESTRICTION 2: Rostered player trying to view opponent's playbook
  if (!isEmbedded && isOpponentPlayer) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-[var(--team-ink)]">
        <TeamNavBar teamId={teamId} />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 text-center bg-[#0B0F19] border border-amber-500/30 rounded-3xl shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
                Opponent Playbook Protected
              </span>
              <h2 className="text-2xl font-black uppercase text-white mt-3">This Playbook Is Private</h2>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                As a rostered player, you only have view access to the playbooks of your own team. Opponent team playbooks and strategic formations are strictly restricted.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href={`/teams/${playerTeamId}/playbook`}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
                style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
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
        <TeamPortalFooter section="Team Playbook" />
      </div>
    );
  }

  // RESTRICTION 3: Guest or general user without team admin/player role
  if (!isEmbedded && !canViewPlaybook) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-[var(--team-ink)]">
        <TeamNavBar teamId={teamId} />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 text-center bg-[#0B0F19] border border-cyan-500/30 rounded-3xl shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[var(--team-ink)] shadow-lg shadow-cyan-500/10">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-cyan-500/30 text-[var(--team-ink)] text-xs font-mono font-bold uppercase tracking-wider">
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
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500  font-black text-xs uppercase tracking-wider transition-all shadow-lg"
                style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
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
        <TeamPortalFooter section="Team Playbook" />
      </div>
    );
  }

  // Dedicated Embedded Layout for Showcase (Directly renders PlayCanvas with compact controls)
  if (isEmbedded) {
    return (
      <div className="h-[calc(100dvh-var(--role-switcher-height,0px))] min-h-0 bg-black text-white font-sans p-2 sm:p-3 flex flex-col gap-2 selection:bg-cyan-500/30 selection:text-[var(--team-ink)] w-full max-w-full overflow-hidden">
        {/* Compact Header for Embedded Showcase */}
        <div className="flex items-center gap-1.5 bg-[#0B0F19] p-1.5 rounded-xl border border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-[var(--team-ink)] border border-cyan-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{teamName} Playbook </span><span>Studio</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <select
              aria-label="Play"
              value={activePlayId || ""}
              onChange={(event) => setActivePlayId(event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/60 px-1.5 text-xs text-white"
            >
              {(activePlaybook?.plays || []).map((play) => <option key={play.id} value={play.id}>{play.name.replace(/^\d+v\d+\s+/, "")}</option>)}
            </select>

            {/* Playbook Switcher (Offense vs Defense) */}
            {playbooks.length > 1 && (
              <select
                aria-label="Playbook"
                value={activePlaybook?.id || ""}
                onChange={(e) => {
                  const book = playbooks.find((b) => b.id === e.target.value);
                  if (book) {
                    setActivePlaybookId(book.id);
                    if (book.plays.length > 0) setActivePlayId(book.plays[0].id);
                  }
                }}
                className="h-9 w-[38%] min-w-0 max-w-56 bg-black/60 border border-white/15 text-xs font-bold text-neutral-200 rounded-lg px-1.5 outline-none cursor-pointer"
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
        <div className="flex-1 min-h-0 overflow-hidden">
          {activePlay ? (
            <PlayCanvas
              play={activePlay}
              onChange={handleUpdateActivePlay}
              readOnly={false}
              playbook={activePlaybook}
              guideInToolbar="always"
            />
          ) : (
            <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-12 text-center text-neutral-400">
              <BookOpen className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
              <h3 className="text-xl font-bold uppercase text-white mb-2">Loading Playbook...</h3>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${viewLevel === "editor" ? "h-[calc(100dvh-var(--role-switcher-height,0px))] min-h-0 overflow-hidden" : "min-h-screen"} bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-[var(--team-ink)] relative flex flex-col`}>

      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-15">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full mix-blend-screen filter blur-[160px] opacity-25 animate-pulse" style={{ backgroundColor: palette.primary }} />
        <div className="absolute bottom-20 -right-40 w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[160px] opacity-20 animate-pulse delay-1000" style={{ backgroundColor: palette.secondary !== "#FFFFFF" ? palette.secondary : palette.primary }} />
      </div>

      <TeamNavBar
        teamId={teamId}
        className={viewLevel === "editor" ? "top-0! max-sm:hidden [@media(max-height:450px)]:hidden" : ""}
      />

      <div className={`mx-auto ${
        viewLevel === "editor"
          ? "max-w-[1600px] p-1.5 sm:p-3 [@media(max-height:450px)]:p-1 flex flex-col gap-2 [@media(max-height:450px)]:gap-1 min-h-0 flex-1 overflow-hidden"
          : isEmbedded
          ? "max-w-7xl space-y-3 p-2 sm:p-3 flex-1"
          : "max-w-7xl space-y-6 p-4 sm:p-6 md:p-8 flex-1"
      } relative z-10 w-full`}>
        {/* ============================================================== */}
        {/* 1. TOP HEADER & BREADCRUMBS (FOR LEVEL 1 & 2 DRILLDOWN)       */}
        {/* ============================================================== */}
        {viewLevel !== "editor" && (
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
                <span className="inline-flex items-center text-[var(--team-ink)] bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/30 text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5 mr-1 text-[var(--team-ink)]" />
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

              <span className="text-xs text-neutral-500">•</span>

              <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-cyan-500/30 text-[10px] font-mono font-bold uppercase text-[var(--team-ink)]">
                {(activePlaybook?.playersOnField || playersPerSide)}v{(activePlaybook?.playersOnField || playersPerSide)} Flag Format
              </span>

              {isRosteredPlayerOnTeam && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase text-emerald-300 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Player View Only</span>
                </span>
              )}
            </div>

            {/* Level 1 Title: "{Team Name}'s Playbooks" */}
            {viewLevel === "playbooks" && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--league-primary)] to-[var(--league-accent)] flex items-center justify-center text-white shadow-lg p-1.5">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                    {teamName}&apos;s <span style={{ color: "var(--team-ink)" }}>Playbooks</span>
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
                          ? "bg-cyan-500/15 text-[var(--team-ink)] border-cyan-500/30"
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
            {viewLevel === "plays" && (
              <div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                  {effectiveFormationName} <span className="text-[var(--team-ink)]">Plays</span>
                </h1>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Preview each play, then select a card to {hasEditAccess ? "edit" : "view"} its routes and assignments.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            {viewLevel === "plays" && hasEditAccess && (
              <button
                type="button"
                data-tour="new-play-btn"
                onClick={handleCreatePlayInFormationClick}
                className="px-5 py-2.5 rounded-2xl hover:opacity-90 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer"
                style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#000000") }}
              >
                <Plus className="w-4 h-4" />
                <span>New Play</span>
              </button>
            )}
            {/* Level 1: "+ Create Playbook" */}
            {viewLevel === "playbooks" && hasEditAccess && (
              <button
                type="button"
                data-tour="create-playbook-btn"
                disabled={playbooks.length >= MAX_PLAYBOOKS_PER_TEAM}
                onClick={() => setIsCreatePlaybookOpen(true)}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                  playbooks.length < MAX_PLAYBOOKS_PER_TEAM
                    ? "hover:opacity-90 shadow-lg cursor-pointer"
                    : "bg-white/5 text-neutral-500 border border-white/10 cursor-not-allowed"
                }`}
                style={playbooks.length < MAX_PLAYBOOKS_PER_TEAM ? { backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#000000") } : undefined}
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
                className="px-5 py-2.5 rounded-2xl hover:opacity-90 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#000000") }}
              >
                <Plus className="w-4 h-4" />
                <span>Create Formation</span>
              </button>
            )}

            {/* Print Armbands (Available for Formations view) */}
            {(viewLevel === "formations" || viewLevel === "plays") && canViewPlaybook && (
              <button
                data-tour="print-armband-btn"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[var(--team-ink)]" />
                <span>Print Armbands</span>
              </button>
            )}

            {/* Auto-Save Cloud Status Indicator */}
            {hasEditAccess && (
              <button
                type="button"
                data-tour="autosave-status"
                onClick={flushAutoSave}
                aria-label="Auto-save status"
                title={autoSaveStatus === "unsaved" ? "Unsaved changes: click to sync immediately" : "Auto-saving to cloud is active"}
                className="px-3.5 py-2 max-sm:px-2 max-sm:py-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono flex items-center gap-2 transition-all hover:bg-white/10 cursor-pointer"
                data-testid="autosave-status-badge"
              >
                {autoSaveStatus === "saving" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--team-ink)] animate-spin" />
                    <span className="text-[var(--team-ink)] font-semibold max-sm:hidden">Saving...</span>
                    <span className="text-[var(--team-ink)] font-semibold sm:hidden">Saving...</span>
                  </>
                ) : autoSaveStatus === "unsaved" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300 max-sm:hidden">Unsaved changes</span>
                    <span className="text-amber-300 sm:hidden">Unsaved</span>
                  </>
                ) : autoSaveStatus === "offline" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-neutral-300 max-sm:hidden">Saved locally (offline)</span>
                    <span className="text-neutral-300 sm:hidden">Offline</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-neutral-300 max-sm:hidden">Saved</span>
                    <span className="text-neutral-300 sm:hidden">Saved</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        )}

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

            {playbooks.length === 0 ? (
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-8 sm:p-12 text-center text-neutral-400 shadow-xl">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-4 shadow-inner">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black uppercase text-white mb-2">No Playbooks Created Yet</h3>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-6 leading-relaxed">
                  {hasEditAccess
                    ? "Create a playbook to organize your formations and plays."
                    : "Your coaching staff has not created any playbooks for this team yet."}
                </p>
                {hasEditAccess && (
                  <button
                    type="button"
                    data-testid="create-first-playbook-btn"
                    onClick={() => setIsCreatePlaybookOpen(true)}
                    className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:opacity-90 inline-flex items-center gap-2 cursor-pointer"
                    style={{
                      backgroundColor: palette.primary,
                      color: getReadableTextColor(palette.primary, "#000000"),
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Playbook</span>
                  </button>
                )}
              </div>
            ) : (
              <div data-tour="playbook-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                                  ? "bg-cyan-500/10 text-[var(--team-ink)] border-cyan-500/30"
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

                          {hasEditAccess && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                data-tour="edit-playbook-btn"
                                data-testid={`edit-playbook-btn-${book.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPlaybook(book);
                                  setIsEditPlaybookOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-[var(--team-ink)] hover:bg-white/10 transition-colors"
                                title="Edit playbook details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {canDeletePlaybook && (
                                <button
                                  type="button"
                                  data-testid={`delete-playbook-btn-${book.id}`}
                                  onClick={(e) => handleDeletePlaybook(book.id, e)}
                                  className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-white/10 transition-colors"
                                  title="Delete playbook"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                      <h3 className="text-xl font-black uppercase text-white group-hover:text-[var(--team-ink)] transition-colors">
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

                      <span className="text-xs font-black uppercase tracking-wider text-[var(--team-ink)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Open</span>
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
        {/* LEVEL 2: FORMATIONS CARDS DASHBOARD (WITH PRE-SNAP SPOTS)       */}
        {/* ============================================================== */}
        {viewLevel === "formations" && activePlaybook && (
          <div className="space-y-6">
            <div data-tour="formations-toolbar" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F19] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewLevel("playbooks")}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>All Playbooks</span>
                </button>
                <span className="text-xs text-neutral-500">•</span>
                <span className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                  <span>Formations in <strong className="text-white">{activePlaybook.title}</strong> ({activePlaybook.formations.length})</span>
                  {hasEditAccess && (
                    <button
                      type="button"
                      data-testid="edit-active-playbook-btn"
                      onClick={() => {
                        setEditingPlaybook(activePlaybook);
                        setIsEditPlaybookOpen(true);
                      }}
                      className="p-1 rounded-lg text-neutral-400 hover:text-[var(--team-ink)] hover:bg-white/10 transition-colors cursor-pointer"
                      title="Edit playbook details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDeletePlaybook && (
                    <button
                      type="button"
                      data-testid="delete-active-playbook-btn"
                      onClick={(e) => handleDeletePlaybook(activePlaybook.id, e)}
                      className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                      title="Delete this playbook"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                    style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
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
                    style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
                  >
                    Place Players in Formation
                  </button>
                )}
              </div>
            ) : (
              <div data-tour="formation-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          <h3 className="text-lg font-black uppercase text-white group-hover:text-[var(--team-ink)] transition-colors">
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
                            <button
                              type="button"
                              data-testid={`delete-formation-btn-${formation.id || formation.name}`}
                              onClick={(e) => handleDeleteFormation(formation.name, e)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-white/10"
                              title="Delete formation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

                        <span className="text-xs font-black uppercase tracking-wider text-[var(--team-ink)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
        {/* LEVEL 3: PLAY CARDS WITH ROUTE PREVIEWS                       */}
        {/* ============================================================== */}
        {viewLevel === "plays" && activePlaybook && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setViewLevel("formations")}
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to formations
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-400">
                  {playsInActiveFormation.length} {playsInActiveFormation.length === 1 ? "Play" : "Plays"} in <strong className="text-white">{activePlaybook.title}</strong>
                </span>
                {hasEditAccess && (
                  <button
                    type="button"
                    data-tour="edit-playbook-btn"
                    data-testid="edit-playbook-level3-btn"
                    onClick={() => {
                      setEditingPlaybook(activePlaybook);
                      setIsEditPlaybookOpen(true);
                    }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-[var(--team-ink)] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Edit playbook details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {playsInActiveFormation.length === 0 ? (
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-12 text-center text-neutral-400">
                <BookOpen className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                <h2 className="text-xl font-bold uppercase text-white mb-2">No Plays in this Formation</h2>
                <p className="text-xs">
                  {hasEditAccess ? "Choose New Play to create the first play in this formation." : "Your coach has not added any plays to this formation yet."}
                </p>
              </div>
            ) : (
              <div data-tour="play-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {playsInActiveFormation.map((play) => (
                  <div
                    key={play.id}
                    className="bg-[#0B0F19] hover:bg-[#0E1424] border border-white/10 hover:border-cyan-500/50 rounded-3xl p-5 transition-all duration-200 shadow-xl group"
                  >
                    <button
                      type="button"
                      aria-label={`Open play ${play.name}`}
                      onClick={() => {
                        setActivePlayId(play.id);
                        setViewLevel("editor");
                      }}
                      className="w-full text-left space-y-4 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-4"
                    >
                      <div>
                        <h3 className="text-lg font-black uppercase text-white group-hover:text-[var(--team-ink)] transition-colors">
                          {play.name.replace(/^\d+v\d+\s+/, "")}
                        </h3>
                        <span className="text-[11px] font-mono text-neutral-400">{play.situation}</span>
                      </div>
                      <div
                        role="img"
                        aria-label={`Preview of ${play.name}`}
                        className="w-full aspect-[10/7] bg-[#102319] rounded-2xl border border-white/10 overflow-hidden shadow-inner group-hover:border-cyan-500/30 transition-colors"
                      >
                        <MiniPlayDiagram play={play} theme="dark" showLabels={true} showOpposingSide={showOpposingSide} />
                      </div>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-neutral-400">{play.formation}</span>
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--team-ink)] flex items-center gap-1">
                          {hasEditAccess ? "Edit Play" : "View Play"}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                    {hasEditAccess && (
                      <div className="flex items-end justify-end gap-2 mt-3">
                        <label className="flex-1 min-w-0 space-y-1 text-xs text-neutral-400">
                          <span>Category</span>
                          <select
                            aria-label={`Category for ${play.name}`}
                            value={play.formation}
                            onChange={(event) => handleUpdateActivePlay({ ...play, formation: event.target.value })}
                            className="block w-full min-w-0 rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-[var(--team-ink)] outline-none focus:border-cyan-400"
                          >
                            {activePlaybook.formations.map((formation) => (
                              <option key={formation.id} value={formation.name}>{formation.name}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          aria-label={`Duplicate ${play.name}`}
                          onClick={() => handleDuplicatePlay(play)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${play.name}`}
                          onClick={() => handleDeletePlay(play.id)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full editor for the selected play */}
        {viewLevel === "editor" && activePlaybook && (
          <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
            {/* Tactical Playmaker Canvas Workspace */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activePlay ? (
                <PlayCanvas
                  play={activePlay}
                  onChange={handleUpdateActivePlay}
                  readOnly={!hasEditAccess}
                  hasEditAccess={hasEditAccess}
                  playbook={activePlaybook}
                  allPlaybooks={playbooks}
                  onBackToPlays={() => setViewLevel("plays")}
                  onOpenQuestions={() => setIsQuestionsModalOpen(true)}
                  autoSaveStatus={autoSaveStatus}
                  onFlushAutoSave={flushAutoSave}
                />
              ) : (
                <div className="bg-[#0B0F19] border border-white/10 rounded-2xl p-8 text-center text-neutral-400">
                  <BookOpen className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
                  <h3 className="text-lg font-bold uppercase text-white mb-2">No Plays in this Formation</h3>
                  {hasEditAccess && (
                    <button
                      onClick={handleCreatePlayInFormationClick}
                      className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs uppercase cursor-pointer"
                      style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
                    >
                      Create Play in {selectedFormationName}
                    </button>
                  )}
                </div>
              )}
            </div>
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

      {/* MODAL 1B: Edit Playbook Details */}
      <EditPlaybookModal
        isOpen={isEditPlaybookOpen}
        onClose={() => {
          setIsEditPlaybookOpen(false);
          setEditingPlaybook(null);
        }}
        playbook={editingPlaybook}
        onSave={handleUpdatePlaybook}
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

      {/* MODAL 4: Player-to-Coach Play Questions & Answers */}
      {activePlay && (
        <PlayQuestionsModal
          isOpen={isQuestionsModalOpen}
          onClose={() => setIsQuestionsModalOpen(false)}
          play={activePlay}
          onUpdateQuestions={handleUpdateActivePlayQuestions}
          isPlayer={isPlayer}
          isCoach={hasEditAccess}
          currentUser={currentUserForQuestions}
        />
      )}

      {/* Playbook Footer with Powered by FlagOS Disclaimer */}
      {viewLevel !== "editor" && <footer className="relative z-10 w-full border-t border-white/10 bg-black/80 backdrop-blur-md py-6 px-6 text-xs text-neutral-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase">{teamName}</span>
            <span>•</span>
            <span>Playbook</span>
            <span>•</span>
            <span>Coaches and players only</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-400 font-medium">
            <span>Powered by</span>
            <FlagOSText />
          </div>
        </div>
      </footer>}

    </div>
  );
}
