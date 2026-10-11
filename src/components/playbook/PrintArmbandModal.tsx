"use client";

import React, { useState } from "react";
import { Playbook, PlayDiagram, GAMEDAY_SITUATIONS } from "@/lib/playbookTypes";
import MiniPlayDiagram from "./MiniPlayDiagram";
import {
  Printer,
  X,
  Layers,
  FileText,
  CreditCard,
  Sliders,
  Check,
  Download,
  Eye,
  EyeOff,
  Zap,
  Shield
} from "lucide-react";

interface PrintArmbandModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbook: Playbook;
  teamName: string;
}

type PrintMode = "armband" | "playbook" | "callsheet";
type ArmbandDensity = 1 | 2 | 4 | 8;

export default function PrintArmbandModal({
  isOpen,
  onClose,
  playbook,
  teamName,
}: PrintArmbandModalProps) {
  const [printMode, setPrintMode] = useState<PrintMode>("armband");
  const [playsPerCard, setPlaysPerCard] = useState<ArmbandDensity>(4);
  const [showOpposingSide, setShowOpposingSide] = useState<boolean>(false);
  const [selectedPlayIds, setSelectedPlayIds] = useState<string[]>(
    playbook.plays.map((p) => p.id)
  );

  if (!isOpen) return null;

  const playsToPrint = playbook.plays.filter((p) => selectedPlayIds.includes(p.id));

  const handleTogglePlay = (id: string) => {
    if (selectedPlayIds.includes(id)) {
      if (selectedPlayIds.length === 1) return; // Keep at least one
      setSelectedPlayIds(selectedPlayIds.filter((pId) => pId !== id));
    } else {
      setSelectedPlayIds([...selectedPlayIds, id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedPlayIds(playbook.plays.map((p) => p.id));
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  // Group plays by situation for Gameday Call Sheet
  const playsBySituation: Record<string, PlayDiagram[]> = {};
  GAMEDAY_SITUATIONS.forEach((sit) => {
    playsBySituation[sit] = [];
  });
  // Also collect any custom situations
  playsToPrint.forEach((play) => {
    const sitKey =
      GAMEDAY_SITUATIONS.find((s) => s.toLowerCase().includes(play.situation.toLowerCase())) ||
      play.situation ||
      "Standard / 1st Down";
    if (!playsBySituation[sitKey]) {
      playsBySituation[sitKey] = [];
    }
    playsBySituation[sitKey].push(play);
  });

  // Chunk plays into cards for Armband Card mode
  const armbandCards: PlayDiagram[][] = [];
  for (let i = 0; i < playsToPrint.length; i += playsPerCard) {
    armbandCards.push(playsToPrint.slice(i, i + playsPerCard));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Print Styles for flawless hardcopy / PDF output */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area,
          #print-area * {
            visibility: visible !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-[#0B0F19] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Modal Top Control Bar (Hidden during print) */}
        <div className="no-print p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#0E1422]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Print & Export Suite
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {teamName} • {playbook.title}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black uppercase text-white mt-1">
              Armband Cards & Playbook Printing
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerPrint}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (Hidden during print) */}
        <div className="no-print px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintMode("armband")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border ${
                printMode === "armband"
                  ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20"
                  : "bg-white/5 text-neutral-300 border-white/10 hover:border-white/20"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>QB Armband Cards</span>
            </button>

            <button
              onClick={() => setPrintMode("callsheet")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border ${
                printMode === "callsheet"
                  ? "bg-purple-500 text-black border-purple-400 shadow-md shadow-purple-500/20"
                  : "bg-white/5 text-neutral-300 border-white/10 hover:border-white/20"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Gameday Call Sheet (By Situation)</span>
            </button>

            <button
              onClick={() => setPrintMode("playbook")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border ${
                printMode === "playbook"
                  ? "bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20"
                  : "bg-white/5 text-neutral-300 border-white/10 hover:border-white/20"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Playbook Binder</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Show Opposing Side Toggle */}
            <button
              onClick={() => setShowOpposingSide(!showOpposingSide)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs ${
                showOpposingSide
                  ? "bg-amber-500 text-black border-amber-400 font-bold"
                  : "bg-white/5 text-neutral-300 border-white/10 hover:border-white/20"
              }`}
              title={
                showOpposingSide
                  ? `Hide opposing ${playbook.type === "offense" ? "defense" : "offense"}`
                  : `Show opposing ${playbook.type === "offense" ? "defense" : "offense"}`
              }
            >
              {showOpposingSide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>
                {showOpposingSide
                  ? `Hide Opposing ${playbook.type === "offense" ? "Defense" : "Offense"}`
                  : `Show Opposing ${playbook.type === "offense" ? "Defense" : "Offense"}`}
              </span>
            </button>

            {/* Density Selector for Armband Cards */}
            {printMode === "armband" && (
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                <span className="text-[11px] font-mono text-neutral-400 px-2">Plays / Card:</span>
                {([1, 2, 4, 8] as ArmbandDensity[]).map((num) => (
                  <button
                    key={num}
                    onClick={() => setPlaysPerCard(num)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      playsPerCard === num
                        ? "bg-cyan-500 text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Printable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#060911] text-black">
          <div
            id="print-area"
            className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-2xl text-black border border-neutral-300 font-sans"
          >
            {/* Header for print output */}
            <div className="border-b-2 border-black pb-3 mb-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-black tracking-widest text-neutral-500">
                  FLAG FOOTBALL GAMEDAY ARMBAND & PLAYBOOK
                </span>
                <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                  {teamName} — {playbook.title}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-neutral-600 block">
                  {playbook.type === "offense" ? "OFFENSE" : "DEFENSE"} • {playbook.playersOnField || 5}v{playbook.playersOnField || 5} FORMAT
                </span>
                <span className="text-xs font-mono font-bold text-black">
                  {printMode === "armband"
                    ? `Armband Inserts (${playsPerCard} Plays/Card)`
                    : printMode === "callsheet"
                    ? "Gameday Call Sheet by Situation"
                    : "Complete Playbook"}
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 1. ARMBAND WRIST COACH CARDS (1, 2, 4, 8 PLAYS PER CARD) */}
            {/* ========================================================= */}
            {printMode === "armband" && (
              <div className="space-y-8">
                {armbandCards.map((cardPlays, cardIdx) => (
                  <div
                    key={cardIdx}
                    className="avoid-break border-2 border-dashed border-neutral-400 rounded-xl p-3 bg-neutral-50 shadow-sm relative"
                  >
                    {/* Card Cut Boundary Guide Marker */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-1 mb-2">
                      <span>✂ Cut along dashed border for wrist coach insert</span>
                      <span>
                        Card #{cardIdx + 1} • {cardPlays.length} Plays
                      </span>
                    </div>

                    {/* Dynamic Grid Layout based on playsPerCard */}
                    <div
                      className={`grid gap-2 ${
                        playsPerCard === 1
                          ? "grid-cols-1"
                          : playsPerCard === 2
                          ? "grid-cols-2"
                          : playsPerCard === 4
                          ? "grid-cols-2"
                          : "grid-cols-4"
                      }`}
                    >
                      {cardPlays.map((play, playIdx) => {
                        const globalPlayNum = cardIdx * playsPerCard + playIdx + 1;
                        return (
                          <div
                            key={play.id}
                            className="border border-neutral-300 rounded-lg bg-white p-2 flex flex-col justify-between shadow-xs overflow-hidden"
                          >
                            {/* Card Slot Header */}
                            <div className="flex items-center justify-between border-b border-neutral-100 pb-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-md bg-black text-white text-[11px] font-black font-mono flex items-center justify-center shrink-0">
                                  {globalPlayNum}
                                </span>
                                <span className="text-[11px] font-black uppercase text-black truncate max-w-[120px]">
                                  {play.name}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 font-bold shrink-0">
                                {play.formation}
                              </span>
                            </div>

                            {/* Scaled Mini SVG Diagram */}
                            <div className="w-full aspect-[16/11] bg-neutral-100 rounded border border-neutral-200 overflow-hidden my-1">
                              <MiniPlayDiagram play={play} theme="light" showOpposingSide={showOpposingSide} />
                            </div>

                            {/* Key Progression / Gameday Situation Badge */}
                            <div className="flex items-center justify-between text-[9px] font-mono pt-1 text-neutral-600 border-t border-neutral-100">
                              <span className="truncate max-w-[130px]">
                                {play.notes ? play.notes : `Read: Primary concept`}
                              </span>
                              <span className="font-bold text-neutral-800 shrink-0">
                                {play.situation}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ========================================================= */}
            {/* 2. GAMEDAY CALL SHEET (SORTED BY SITUATION)               */}
            {/* ========================================================= */}
            {printMode === "callsheet" && (
              <div className="space-y-6">
                {Object.entries(playsBySituation)
                  .filter(([_, plays]) => plays.length > 0)
                  .map(([situation, sitPlays]) => (
                    <div
                      key={situation}
                      className="avoid-break border border-neutral-300 rounded-xl overflow-hidden bg-neutral-50 shadow-xs"
                    >
                      {/* Situation Header Banner */}
                      <div className="bg-neutral-900 text-white px-3 py-1.5 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider">
                          {situation}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-300">
                          {sitPlays.length} Calls
                        </span>
                      </div>

                      {/* Plays Grid in this situation */}
                      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white">
                        {sitPlays.map((play, sIdx) => (
                          <div
                            key={play.id}
                            className="border border-neutral-200 rounded-lg p-2 bg-neutral-50 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between border-b border-neutral-200 pb-1 mb-1">
                              <span className="text-[11px] font-black uppercase text-black truncate">
                                {play.name}
                              </span>
                              <span className="text-[9px] font-mono text-neutral-500 font-bold">
                                {play.formation}
                              </span>
                            </div>

                            <div className="w-full aspect-[16/11] bg-white rounded border border-neutral-200 overflow-hidden my-1">
                              <MiniPlayDiagram play={play} theme="light" showOpposingSide={showOpposingSide} />
                            </div>

                            <div className="text-[9px] font-mono text-neutral-600 truncate mt-0.5">
                              {play.notes || "Standard gameday progression"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ========================================================= */}
            {/* 3. FULL PLAYBOOK BINDER (2 PLAYS PER PAGE DETAIL)         */}
            {/* ========================================================= */}
            {printMode === "playbook" && (
              <div className="space-y-8">
                {playsToPrint.map((play, pIdx) => (
                  <div
                    key={play.id}
                    className="avoid-break border-2 border-neutral-300 rounded-2xl p-5 bg-white shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-black text-white text-xs font-mono font-black">
                            #{pIdx + 1}
                          </span>
                          <h3 className="text-lg font-black uppercase text-black">{play.name}</h3>
                        </div>
                        <span className="text-xs font-mono text-neutral-500">
                          Formation: <strong className="text-black">{play.formation}</strong> • Situation:{" "}
                          <strong className="text-black">{play.situation}</strong>
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-neutral-700 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                        {playbook.playersOnField || 5}v{playbook.playersOnField || 5} {play.type === "offense" ? "Offense" : "Defense"}
                      </span>
                    </div>

                    {/* Large Crisp Field Diagram */}
                    <div className="w-full aspect-[16/10] bg-neutral-100 rounded-xl border border-neutral-300 overflow-hidden">
                      <MiniPlayDiagram play={play} theme="light" showOpposingSide={showOpposingSide} />
                    </div>

                    {/* Personnel Route Assignments & Coaching Notes */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-neutral-200">
                      <div>
                        <span className="font-bold text-neutral-800 uppercase block mb-1">
                          Personnel Assignments:
                        </span>
                        <ul className="space-y-0.5 text-neutral-600 text-[11px]">
                          {play.players
                            .filter((p) => p.side === play.type)
                            .map((p) => (
                              <li key={p.id}>
                                <strong className="text-black">{p.label}</strong> ({p.role}):{" "}
                                {p.quickRouteName ||
                                  p.coverageType ||
                                  (p.route && p.route.length > 0 ? "Custom Route" : "Standard spot")}
                              </li>
                            ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-bold text-neutral-800 uppercase block mb-1">
                          Coaching Progression & Gameday Notes:
                        </span>
                        <p className="text-[11px] text-neutral-600 leading-relaxed bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                          {play.notes || "Read free safety alignment. Work primary receiver on second step."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
