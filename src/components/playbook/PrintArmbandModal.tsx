"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  X,
  Check,
  Layers,
  Sliders,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  Shield,
  Eye,
  Scissors,
} from "lucide-react";
import { Playbook, PlayDiagram, GAMEDAY_SITUATIONS } from "@/lib/playbookTypes";
import MiniPlayDiagram from "@/components/playbook/MiniPlayDiagram";

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
  const [mounted, setMounted] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>("armband");
  const [playsPerCard, setPlaysPerCard] = useState<ArmbandDensity>(4);
  const [showOpposingSide, setShowOpposingSide] = useState<boolean>(false);
  const [selectedPlayIds, setSelectedPlayIds] = useState<string[]>([]);
  const [isPlayFilterOpen, setIsPlayFilterOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (playbook?.plays) {
      setSelectedPlayIds(playbook.plays.map((p) => p.id));
    }
  }, [playbook]);

  if (!isOpen) return null;
  if (!mounted) return null;

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

  const printStyles = `
    @media print {
      @page {
        size: auto;
        margin: 8mm 10mm 10mm 10mm;
      }

      /* 1. Reset root documents for seamless multi-page printing */
      html, body {
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        background: #ffffff !important;
        color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* 2. Hide everything in document body EXCEPT the print portal */
      body > :not(#flagos-print-portal) {
        display: none !important;
      }

      /* 3. Also hide any headers, navigation, footers, and modal chrome */
      #__next,
      header,
      footer,
      nav,
      .no-print {
        display: none !important;
      }

      /* 4. Flatten the print portal completely into standard document flow */
      #flagos-print-portal {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
        margin: 0 !important;
        inset: auto !important;
        transform: none !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        z-index: auto !important;
      }

      /* 5. Flatten all modal containers inside portal */
      #flagos-print-portal .print-modal-backdrop {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        inset: auto !important;
      }

      #flagos-print-portal .print-modal-dialog {
        display: block !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        background: #ffffff !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      #flagos-print-portal .print-scroll-container {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      /* 6. The Print Area */
      #print-area {
        display: block !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        background: #ffffff !important;
        color: #000000 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      /* 7. Ensure graphics, borders, and SVGs print accurately */
      #print-area,
      #print-area * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* 8. Page break control */
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .page-break-after {
        page-break-after: always !important;
        break-after: page !important;
      }

      .page-break-before {
        page-break-before: always !important;
        break-before: page !important;
      }
    }
  `;

  const modalJSX = (
    <div id="flagos-print-portal">
      {/* Inject print styles */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* Screen Backdrop */}
      <div className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <div className="print-modal-dialog bg-[#0B0F19] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
          
          {/* Modal Top Control Bar (Hidden during print) */}
          <div className="no-print p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#0E1422]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Print &amp; Export Suite
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  {teamName} • {playbook.title}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white mt-1">
                Armband Cards &amp; Playbook Printing
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleTriggerPrint}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode Selector Tabs (Hidden during print) */}
          <div className="no-print px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                onClick={() => setPrintMode("armband")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  printMode === "armband"
                    ? "bg-cyan-500 text-black font-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Armband Inserts</span>
              </button>
              <button
                onClick={() => setPrintMode("callsheet")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  printMode === "callsheet"
                    ? "bg-cyan-500 text-black font-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Gameday Call Sheet</span>
              </button>
              <button
                onClick={() => setPrintMode("playbook")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  printMode === "playbook"
                    ? "bg-cyan-500 text-black font-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Complete Playbook</span>
              </button>
            </div>

            {/* Density Selector for Armband Mode */}
            {printMode === "armband" && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-mono text-[11px]">Plays per Card:</span>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 font-mono">
                  {([1, 2, 4, 8] as ArmbandDensity[]).map((density) => (
                    <button
                      key={density}
                      onClick={() => setPlaysPerCard(density)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        playsPerCard === density
                          ? "bg-white text-black"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opposing Side Toggle */}
            <button
              onClick={() => setShowOpposingSide(!showOpposingSide)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showOpposingSide
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showOpposingSide ? "Opponents: Shown" : "Opponents: Hidden"}</span>
            </button>
          </div>

          {/* Filter Plays Drawer Toggle (Hidden during print) */}
          <div className="no-print px-4 sm:px-6 py-2 bg-[#0B0F19] border-b border-white/5 flex items-center justify-between text-xs">
            <button
              onClick={() => setIsPlayFilterOpen(!isPlayFilterOpen)}
              className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono text-[11px]"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${isPlayFilterOpen ? "rotate-90 text-cyan-400" : ""}`}
              />
              <span>Filter Included Plays ({playsToPrint.length} of {playbook.plays.length} selected)</span>
            </button>

            {isPlayFilterOpen && (
              <button
                onClick={handleSelectAll}
                className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold"
              >
                Select All Plays
              </button>
            )}
          </div>

          {/* Play Filter Selection Checkbox Grid (Hidden during print) */}
          {isPlayFilterOpen && (
            <div className="no-print p-4 bg-black/80 border-b border-white/10 max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              {playbook.plays.map((play) => {
                const isSelected = selectedPlayIds.includes(play.id);
                return (
                  <button
                    key={play.id}
                    onClick={() => handleTogglePlay(play.id)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500/40 text-white font-bold"
                        : "bg-white/[0.02] border-white/5 text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-cyan-500 border-cyan-500 text-black"
                          : "border-neutral-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate text-xs">{play.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Live Printable Preview Area */}
          <div className="print-scroll-container flex-1 overflow-y-auto p-4 sm:p-8 bg-[#060911] text-black">
            <div
              id="print-area"
              className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-2xl text-black font-sans"
            >
              {/* Header for print output (Clean, concise banner on page 1) */}
              <div className="border-b-2 border-black pb-3 mb-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase font-black tracking-widest text-neutral-500">
                    FLAG FOOTBALL GAMEDAY ARMBAND &amp; PLAYBOOK
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
                      : "Complete Playbook Binder"}
                  </span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 1. ARMBAND WRIST COACH CARDS (1, 2, 4, 8 PLAYS PER CARD) */}
              {/* ========================================================= */}
              {printMode === "armband" && (
                <div className="space-y-8">
                  {armbandCards.map((cardPlays, cardIdx) => {
                    const isLastCard = cardIdx === armbandCards.length - 1;
                    const shouldBreakAfter = playsPerCard >= 8 && !isLastCard;
                    return (
                      <div
                        key={cardIdx}
                        className={`avoid-break border-2 border-dashed border-neutral-400 rounded-xl p-3.5 bg-neutral-50 shadow-sm relative ${
                          shouldBreakAfter ? "page-break-after" : ""
                        }`}
                      >
                        {/* Card Cut Boundary Guide Marker */}
                        <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 uppercase tracking-widest border-b border-neutral-200 pb-1 mb-2.5">
                          <span className="flex items-center gap-1 font-bold text-neutral-700">
                            ✂ Cut along dashed border for wrist coach insert
                          </span>
                          <span className="font-bold">
                            Card #{cardIdx + 1} • {cardPlays.length} Plays • {playbook.title}
                          </span>
                        </div>

                        {/* Dynamic Grid Layout based on playsPerCard */}
                        <div
                          className={`grid gap-2.5 ${
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
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 font-bold shrink-0">
                                    {play.formation}
                                  </span>
                                </div>

                                {/* Scaled Mini SVG Diagram */}
                                <div className="w-full aspect-[16/11] min-h-[90px] bg-white rounded border border-neutral-200 overflow-hidden my-1 flex items-center justify-center">
                                  <MiniPlayDiagram
                                    play={play}
                                    theme="light"
                                    showOpposingSide={showOpposingSide}
                                    className="w-full h-full"
                                  />
                                </div>

                                {/* Key Progression / Gameday Situation Badge */}
                                <div className="flex items-center justify-between text-[9px] font-mono pt-1 text-neutral-600 border-t border-neutral-100">
                                  <span className="truncate max-w-[130px] font-medium">
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
                    );
                  })}
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
                        className="avoid-break border border-neutral-300 rounded-xl overflow-hidden bg-neutral-50 shadow-xs mb-4"
                      >
                        {/* Situation Header Banner */}
                        <div className="bg-neutral-900 text-white px-3.5 py-2 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider">
                            {situation}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-300 font-bold">
                            {sitPlays.length} Calls
                          </span>
                        </div>

                        {/* Plays Grid in this situation */}
                        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white">
                          {sitPlays.map((play) => (
                            <div
                              key={play.id}
                              className="border border-neutral-200 rounded-lg p-2 bg-neutral-50 flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between border-b border-neutral-200 pb-1 mb-1">
                                <span className="text-[11px] font-black uppercase text-black truncate">
                                  {play.name}
                                </span>
                                <span className="text-[9px] font-mono text-neutral-600 font-bold">
                                  {play.formation}
                                </span>
                              </div>

                              <div className="w-full aspect-[16/11] min-h-[90px] bg-white rounded border border-neutral-200 overflow-hidden my-1 flex items-center justify-center">
                                <MiniPlayDiagram
                                  play={play}
                                  theme="light"
                                  showOpposingSide={showOpposingSide}
                                  className="w-full h-full"
                                />
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
              {/* 3. FULL PLAYBOOK BINDER (DETAILED PLAY BREAKDOWN)         */}
              {/* ========================================================= */}
              {printMode === "playbook" && (
                <div className="space-y-8">
                  {playsToPrint.map((play, pIdx) => (
                    <div
                      key={play.id}
                      className="avoid-break border-2 border-neutral-300 rounded-2xl p-5 bg-white shadow-sm space-y-4 mb-6"
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
                      <div className="w-full aspect-[16/10] min-h-[220px] bg-white rounded-xl border border-neutral-300 overflow-hidden flex items-center justify-center">
                        <MiniPlayDiagram
                          play={play}
                          theme="light"
                          showOpposingSide={showOpposingSide}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Personnel Route Assignments & Coaching Notes */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-neutral-200">
                        <div>
                          <span className="font-bold text-neutral-800 uppercase block mb-1">
                            Personnel Assignments:
                          </span>
                          <ul className="space-y-0.5 text-neutral-600 text-[11px]">
                            {play.players
                              .filter((p) => (showOpposingSide ? true : p.side === play.type))
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
                            Coaching Progression &amp; Gameday Notes:
                          </span>
                          <p className="text-[11px] text-neutral-700 leading-relaxed bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
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
    </div>
  );

  return createPortal(modalJSX, document.body);
}
