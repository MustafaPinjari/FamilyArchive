"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Crown,
  FileText,
  Camera,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  X,
  Compass,
} from "lucide-react";
import { TreeLayoutResult, TreeNode, TreeEdge } from "@/lib/tree-layout";
import { FamilyMember, Marriage, Relationship } from "@/types";
import { useLanguage } from "@/lib/i18n";
import { buildFamilyHierarchy } from "@/lib/family-tree-structure";

interface GrandchildItem {
  id: string;
  name: string;
}

interface ChildItem {
  id: string;
  name: string;
  spouse?: { id: string; name: string };
  children?: GrandchildItem[];
}

interface BranchItem {
  id: string;
  name: string;
  nickname?: string;
  isLead?: boolean;
  spouse?: { id: string; name: string };
  children: ChildItem[];
}

interface FamilyTreeCanvasProps {
  layout: TreeLayoutResult;
  members: FamilyMember[];
  marriages?: Marriage[];
  relationships?: Relationship[];
  onSelectMember: (id: string) => void;
  selectedMemberId: string | null;
}

export function FamilyTreeCanvas({
  layout,
  members,
  marriages = [],
  relationships = [],
  onSelectMember,
  selectedMemberId,
}: FamilyTreeCanvasProps) {
  const { language, tName } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically resolve branches from SQLite database
  const branches: BranchItem[] = useMemo(() => {
    const rawBranches = buildFamilyHierarchy(members, marriages, relationships);
    return rawBranches.map((b) => ({
      id: b.lead.id,
      name: b.lead.first_name,
      nickname: b.lead.nickname || undefined,
      isLead: Boolean(b.lead.is_family_lead),
      spouse: b.spouse ? { id: b.spouse.id, name: b.spouse.first_name } : undefined,
      children: b.households.map((hh) => ({
        id: hh.primary.id,
        name: hh.primary.first_name,
        spouse: hh.spouse ? { id: hh.spouse.id, name: hh.spouse.first_name } : undefined,
        children: hh.children.map((c) => ({ id: c.id, name: c.first_name })),
      })),
    }));
  }, [members, marriages, relationships]);

  // Generation 1 root members
  const gen1Members = useMemo(() => {
    return members
      .filter((m) => m.generation === 1)
      .sort((a, b) => a.display_order - b.display_order);
  }, [members]);

  // Jump to items in canvas
  const jumpItems = useMemo(() => {
    const roots = gen1Members.map((r) => ({ id: r.id, name: r.first_name }));
    const branchLeads = branches.map((b) => ({ id: b.id, name: b.name }));
    return [...roots, ...branchLeads];
  }, [gen1Members, branches]);

  // Viewport Transform State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Mode & Filtering
  const [viewMode, setViewMode] = useState<"canvas" | "mobile_explorer">("mobile_explorer");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");

  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, boolean> = { roots: true };
    branches.forEach((b) => {
      initial[b.id] = true;
    });
    setExpandedBranches(initial);
  }, [branches]);

  // Search in tree
  const [treeSearch, setTreeSearch] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Real-time search matches
  const searchResults = useMemo(() => {
    if (!treeSearch.trim()) return [];
    const q = treeSearch.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.first_name.toLowerCase().includes(q) ||
        (m.last_name && m.last_name.toLowerCase().includes(q)) ||
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        tName(m.first_name).toLowerCase().includes(q) ||
        (m.nickname && tName(m.nickname).toLowerCase().includes(q))
    ).slice(0, 6);
  }, [treeSearch, members, tName]);

  // Fit to screen calculation
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !layout.bounds) return;
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    const treeW = layout.bounds.width;
    const treeH = layout.bounds.height;

    if (treeW === 0 || treeH === 0) return;

    const scaleX = (containerW - 80) / treeW;
    const scaleY = (containerH - 80) / treeH;
    const initialScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.1);

    const initialPanX = (containerW - treeW * initialScale) / 2 - layout.bounds.minX * initialScale;
    const initialPanY = 40 - layout.bounds.minY * initialScale;

    setZoom(initialScale);
    setPan({ x: initialPanX, y: initialPanY });
  }, [layout]);

  // Jump to specific node in canvas view
  const jumpToNode = useCallback(
    (nodeId: string) => {
      if (!containerRef.current) return;
      const node = layout.nodes.find((n) => n.id === nodeId);
      if (node) {
        const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
        const targetZoom = 0.95;
        const targetX = containerW / 2 - (node.x + node.width / 2) * targetZoom;
        const targetY = containerH / 2 - (node.y + node.height / 2) * targetZoom;
        setZoom(targetZoom);
        setPan({ x: targetX, y: targetY });
        setHighlightedId(nodeId);
      }
    },
    [layout.nodes]
  );

  // Initial fit on load
  useEffect(() => {
    handleFitToScreen();
    // Default mobile screen to mobile_explorer
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("mobile_explorer");
    }
  }, [handleFitToScreen]);

  // Center on node if selected
  useEffect(() => {
    if (selectedMemberId && containerRef.current && viewMode === "canvas") {
      const node = layout.nodes.find((n) => n.id === selectedMemberId);
      if (node) {
        const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
        const targetX = containerW / 2 - (node.x + node.width / 2) * zoom;
        const targetY = containerH / 2 - (node.y + node.height / 2) * zoom;
        setPan({ x: targetX, y: targetY });
      }
    }
  }, [selectedMemberId, layout.nodes, zoom, viewMode]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 2.2);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Tree search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeSearch.trim()) return;
    const q = treeSearch.toLowerCase().trim();
    const found = members.find(
      (m) =>
        m.first_name.toLowerCase().includes(q) ||
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        tName(m.first_name).toLowerCase().includes(q) ||
        (m.nickname && tName(m.nickname).toLowerCase().includes(q))
    );
    if (found) {
      setHighlightedId(found.id);
      onSelectMember(found.id);
      if (viewMode === "canvas") {
        jumpToNode(found.id);
      }
    }
  };

  const toggleBranch = (id: string) => {
    setExpandedBranches((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Branch filter action
  const handleBranchFilterClick = (branchId: string) => {
    setSelectedBranchFilter(branchId);
    if (branchId !== "all" && branchId !== "roots") {
      setExpandedBranches((prev) => ({ ...prev, [branchId]: true }));
    }
    if (viewMode === "canvas") {
      if (branchId === "roots") {
        const rootId = gen1Members[0]?.id || "mohammad";
        jumpToNode(rootId);
      } else if (branchId !== "all") {
        jumpToNode(branchId);
      } else {
        handleFitToScreen();
      }
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col bg-[#FAF7F2] overflow-hidden select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Main Controls Row: Search + View Mode Switcher */}
        <div className="flex items-center justify-between gap-2 pointer-events-auto flex-wrap sm:flex-nowrap">
          {/* Search Box with Live Results Dropdown */}
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xs border border-stone-200/90 text-xs w-full min-h-[42px]"
            >
              <Search className="w-4 h-4 text-stone-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                placeholder={
                  language === "hi"
                    ? "नाम से खोजें (अख़्तर, मुस्तफ़ा...)"
                    : "Search person (Mustafa, Akhtar...)"
                }
                className="w-full bg-transparent text-stone-800 placeholder-stone-400 outline-none text-xs"
              />
              {treeSearch && (
                <button
                  type="button"
                  onClick={() => setTreeSearch("")}
                  className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Live Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden z-30 animate-in fade-in-50 duration-150">
                <div className="p-1.5 text-[10px] font-bold uppercase text-stone-400 px-3 bg-stone-50 border-b border-stone-100">
                  {language === "hi" ? "त्वरित परिणाम" : "Quick Matches"}
                </div>
                <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectMember(m.id);
                        if (viewMode === "canvas") jumpToNode(m.id);
                        setTreeSearch("");
                      }}
                      className="w-full text-left p-2.5 px-3 hover:bg-amber-50/80 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-200 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {m.first_name[0]}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-xs text-stone-900 truncate">
                            {tName(m.first_name)}{" "}
                            <span className="font-normal text-stone-500 text-[11px]">
                              ({m.first_name})
                            </span>
                          </div>
                          {m.nickname && (
                            <div className="text-[10px] text-amber-800 truncate">
                              &ldquo;{tName(m.nickname)}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md flex-shrink-0">
                        {language === "hi" ? "देखें →" : "View →"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mode Switcher + Zoom Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Clean Segmented Control: Lineage vs Chart */}
            <div className="flex items-center bg-stone-200/90 p-1 rounded-2xl border border-stone-300/80 shadow-2xs">
              <button
                onClick={() => setViewMode("mobile_explorer")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 ${
                  viewMode === "mobile_explorer"
                    ? "bg-amber-900 text-white shadow-xs"
                    : "text-stone-700 hover:text-stone-900"
                }`}
              >
                <span>🌳</span>
                <span>{language === "hi" ? "पीढ़ियां" : "Lineage"}</span>
              </button>
              <button
                onClick={() => setViewMode("canvas")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 ${
                  viewMode === "canvas"
                    ? "bg-amber-900 text-white shadow-xs"
                    : "text-stone-700 hover:text-stone-900"
                }`}
              >
                <span>🗺️</span>
                <span>{language === "hi" ? "चार्ट" : "Chart"}</span>
              </button>
            </div>

            {/* Canvas Zoom Controls (visible in canvas mode) */}
            {viewMode === "canvas" && (
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-xs border border-stone-200/80">
                <button
                  onClick={() => setZoom((z) => Math.min(z * 1.25, 2.2))}
                  className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(z * 0.8, 0.25))}
                  className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFitToScreen}
                  className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  title="Fit to Screen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Branch Filter Chips (Mobile Friendly, Horizontal Scrolling) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none pointer-events-auto">
          {[
            { id: "all", label: language === "hi" ? "संपूर्ण परिवार" : "All Branches" },
            ...(gen1Members.length > 0
              ? [
                  {
                    id: "roots",
                    label:
                      language === "hi"
                        ? "दादा-दादी"
                        : gen1Members.length >= 2
                        ? `${tName(gen1Members[0].first_name)} & ${tName(gen1Members[1].first_name)}`
                        : `${tName(gen1Members[0].first_name)}`,
                  },
                ]
              : []),
            ...branches.map((b, idx) => ({
              id: b.id,
              label: `${idx + 1}. ${tName(b.name)}${b.isLead ? (language === "hi" ? " (मुखिया)" : " (Lead)") : ""}`,
            })),
          ].map((b) => {
            const isSelected = selectedBranchFilter === b.id;
            return (
              <button
                key={b.id}
                onClick={() => handleBranchFilterClick(b.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[34px] shadow-2xs border ${
                  isSelected
                    ? "bg-amber-900 text-white border-amber-950 shadow-xs"
                    : "bg-white/95 text-stone-700 hover:text-stone-900 border-stone-200/90 hover:bg-stone-100"
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Canvas View */}
      {viewMode === "canvas" ? (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className={`w-full h-full relative cursor-grab active:cursor-grabbing tree-canvas-grid ${
            isDragging ? "active:cursor-grabbing" : ""
          }`}
        >
          {/* Zoom/Pan Scaled Stage */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* SVG Connecting Edges */}
            <svg
              className="absolute top-0 left-0 overflow-visible pointer-events-none"
              style={{
                width: layout.bounds.width + 400,
                height: layout.bounds.height + 400,
              }}
            >
              <defs>
                <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#C69234" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#854D0E" stopOpacity="0.5" />
                </linearGradient>
              </defs>

              {layout.edges.map((edge) => {
                if (edge.type === "marriage") {
                  return (
                    <g key={edge.id}>
                      {/* Marriage line */}
                      <line
                        x1={edge.fromX}
                        y1={edge.fromY}
                        x2={edge.toX}
                        y2={edge.toY}
                        stroke="#C69234"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                      />
                      {/* Couple Rings Symbol at midpoint */}
                      <circle
                        cx={(edge.fromX + edge.toX) / 2 - 4}
                        cy={edge.fromY}
                        r="5"
                        fill="none"
                        stroke="#C69234"
                        strokeWidth="1.8"
                      />
                      <circle
                        cx={(edge.fromX + edge.toX) / 2 + 4}
                        cy={edge.fromY}
                        r="5"
                        fill="none"
                        stroke="#D97706"
                        strokeWidth="1.8"
                      />
                    </g>
                  );
                }

                // Parent-to-children branch edge
                return (
                  <path
                    key={edge.id}
                    d={edge.path}
                    fill="none"
                    stroke="#B48B57"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                );
              })}
            </svg>

            {/* Tree Person Cards */}
            {layout.nodes.map((node) => {
              const isSelected = selectedMemberId === node.id;
              const isHighlighted = highlightedId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMember(node.id);
                  }}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                  className={`absolute pointer-events-auto rounded-2xl cursor-pointer transition-all duration-200 group p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                    node.isDeceased
                      ? "bg-stone-100/95 border border-stone-300 hover:border-stone-400 text-stone-700"
                      : node.isLead
                      ? "bg-gradient-to-br from-amber-50 to-white border-2 border-amber-400/90 shadow-amber-200/50"
                      : "bg-white/95 border border-stone-200/90 hover:border-amber-400"
                  } ${isSelected ? "ring-3 ring-amber-600 ring-offset-2 scale-105 shadow-xl" : ""} ${
                    isHighlighted ? "animate-pulse ring-2 ring-amber-500" : ""
                  }`}
                >
                  {/* Avatar Circle */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-serif text-lg font-bold flex-shrink-0 shadow-xs ${
                      node.isDeceased
                        ? "bg-stone-300 text-stone-700 border border-stone-400/60"
                        : node.isLead
                        ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white border border-amber-300"
                        : "bg-stone-900 text-amber-200 border border-stone-800"
                    }`}
                  >
                    {node.member.first_name[0]}
                  </div>

                  {/* Member Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-stone-900 text-sm tracking-tight truncate">
                        {node.member.first_name}
                      </h4>
                    </div>

                    {/* Nickname or role */}
                    {node.member.nickname && (
                      <p className="text-[11px] font-semibold text-amber-800 truncate">
                        &ldquo;{node.member.nickname}&rdquo;
                      </p>
                    )}

                    {/* Badges: Family Lead, Deceased, or Generation */}
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {node.isLead ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md">
                          <Crown className="w-3 h-3 text-amber-700" />
                          Family Lead
                        </span>
                      ) : node.isDeceased ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded-md">
                          <span>🕊️</span> In Memory
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-stone-500">
                          {node.member.family_role || `Gen ${node.generation}`}
                        </span>
                      )}
                    </div>

                    {/* Document & Photo Badges */}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400">
                      {node.hasDocuments ? (
                        <span className="flex items-center gap-0.5 font-medium text-amber-800 bg-amber-100/60 px-1.5 py-0.2 rounded-md">
                          <FileText className="w-3 h-3" />
                          {node.hasDocuments}
                        </span>
                      ) : null}
                      {node.hasPhotos ? (
                        <span className="flex items-center gap-0.5 font-medium text-amber-800 bg-amber-100/60 px-1.5 py-0.2 rounded-md">
                          <Camera className="w-3 h-3" />
                          {node.hasPhotos}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Quick Jump & Mobile Helper Bar in Canvas */}
          <div className="absolute bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xl border border-stone-700/80 text-white max-w-[95vw] overflow-x-auto pointer-events-auto">
            <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1 pl-1 pr-1.5 border-r border-stone-700 whitespace-nowrap">
              <Compass className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "त्वरित पहुंच" : "Jump to"}</span>
            </span>
            {jumpItems.map((item) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToNode(item.id);
                }}
                className="px-2.5 py-1 rounded-full text-xs font-medium hover:bg-stone-800 text-stone-200 hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer min-h-[32px]"
              >
                {tName(item.name)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Mobile & Tablet Lineage Explorer (Touch-Friendly, Progressive Disclosure) */
        <div className="w-full h-full overflow-y-auto px-4 sm:px-6 pt-30 sm:pt-32 pb-32 max-w-2xl mx-auto space-y-4">
          {/* Active Filter Indicator if filtered */}
          {selectedBranchFilter !== "all" && (
            <div className="flex items-center justify-between bg-amber-100/90 border border-amber-300/80 px-4 py-2.5 rounded-2xl text-xs font-semibold text-amber-950 shadow-2xs">
              <span className="flex items-center gap-1.5">
                <span>📍</span>
                <span>
                  {language === "hi" ? "चयनित शाखा:" : "Filtered branch:"}{" "}
                  <strong>
                    {selectedBranchFilter === "roots"
                      ? language === "hi"
                        ? "दादा-दादी"
                        : "Grandparents"
                      : tName(
                          branches.find((b) => b.id === selectedBranchFilter)
                            ?.name || ""
                        )}
                  </strong>
                </span>
              </span>
              <button
                onClick={() => setSelectedBranchFilter("all")}
                className="text-[11px] underline font-bold text-amber-900 hover:text-amber-950 cursor-pointer"
              >
                {language === "hi" ? "सभी शाखाएं देखें" : "View All Branches"}
              </button>
            </div>
          )}

          {/* Root Generation 1: Grandparents */}
          {(selectedBranchFilter === "all" || selectedBranchFilter === "roots") && gen1Members.length > 0 && (
            <div className="bg-stone-900 text-white rounded-3xl p-4 sm:p-5 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300/90 mb-3">
                {language === "hi" ? "दादा-दादी (पीढ़ी 1)" : "Generation 1 — Grandparents"}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gen1Members.map((m) => {
                  const isMemorial = Boolean(m.is_deceased);
                  return (
                    <button
                      key={m.id}
                      onClick={() => onSelectMember(m.id)}
                      className="p-3.5 rounded-2xl bg-stone-800/90 hover:bg-stone-800 text-left transition-all border border-stone-700/80 flex items-center justify-between cursor-pointer min-h-[64px]"
                    >
                      <div className="flex items-center gap-3">
                        {m.photo_url ? (
                          <div className="relative w-12 h-12 rounded-full overflow-hidden border border-amber-300 flex-shrink-0">
                            <img
                              src={m.photo_url}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fb = e.currentTarget.parentElement?.querySelector(".avatar-fb");
                                if (fb) (fb as HTMLElement).style.display = "flex";
                              }}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="avatar-fb hidden absolute inset-0 w-12 h-12 bg-stone-700 text-amber-200 font-serif font-bold text-lg items-center justify-center">
                              {m.first_name[0]}
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-stone-700 text-amber-200 font-serif font-bold text-lg flex items-center justify-center flex-shrink-0">
                            {m.first_name[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-base text-white">{tName(m.first_name)}</div>
                          <div className={`text-xs ${isMemorial ? "text-amber-200/90" : "text-stone-300"}`}>
                            {m.family_role
                              ? tName(m.family_role)
                              : m.gender === "female"
                              ? (language === "hi" ? "दादीजी" : "Grandmother")
                              : (language === "hi" ? "दादाजी" : "Grandfather")}
                            {isMemorial && (language === "hi" ? " • 🕊️ स्मृति में" : " • 🕊️ In Memory")}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-amber-300 bg-stone-700/80 px-2.5 py-1 rounded-lg">
                        {language === "hi" ? "देखें →" : "View →"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generation 2: Family Branches */}
          {selectedBranchFilter !== "roots" && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 px-1">
                {language === "hi" ? "पारिवारिक शाखाएं और उनके परिवार" : "Family Branches & Families"}
              </div>

              {branches
                .filter((branch) =>
                  selectedBranchFilter === "all" ? true : selectedBranchFilter === branch.id
                )
                .map((branch, idx) => {
              const isExpanded = expandedBranches[branch.id] ?? true;
              const bMember = members.find((m) => m.id === branch.id);

              return (
                <div
                  key={branch.id}
                  className={`border rounded-3xl transition-all overflow-hidden ${
                    branch.isLead
                      ? "bg-white border-amber-400/90 shadow-xs"
                      : "bg-white border-stone-200/90 shadow-2xs"
                  }`}
                >
                  {/* Lineage Header */}
                  <div
                    onClick={() => toggleBranch(branch.id)}
                    className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none ${
                      branch.isLead ? "bg-amber-50/40" : "hover:bg-stone-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {bMember?.photo_url ? (
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-amber-300/80 shadow-2xs flex-shrink-0">
                          <img
                            src={bMember.photo_url}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fb = e.currentTarget.parentElement?.querySelector(".avatar-fb");
                              if (fb) (fb as HTMLElement).style.display = "flex";
                            }}
                            className="w-12 h-12 rounded-2xl object-cover"
                          />
                          <div
                            className={`avatar-fb hidden absolute inset-0 w-12 h-12 rounded-2xl items-center justify-center text-lg font-serif font-bold ${
                              branch.isLead ? "bg-amber-900 text-white" : "bg-stone-200 text-stone-800"
                            }`}
                          >
                            {branch.name[0]}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-serif font-bold flex-shrink-0 ${
                            branch.isLead ? "bg-amber-900 text-white" : "bg-stone-200 text-stone-800"
                          }`}
                        >
                          {branch.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-stone-900">
                            {idx + 1}. {tName(branch.name)}
                          </h3>
                          {branch.nickname && (
                            <span className="text-xs font-medium text-amber-950 bg-amber-100 px-2 py-0.5 rounded-md">
                              {tName(branch.nickname)}
                            </span>
                          )}
                          {branch.isLead && (
                            <span className="text-[11px] font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md">
                              {language === "hi" ? "परिवार मुखिया" : "Family Lead"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {language === "hi" ? "पत्नी" : "Spouse"}: <strong>{tName(branch.spouse?.name)}</strong> • {branch.children.length} {language === "hi" ? "बच्चे" : "Children"}
                        </p>
                      </div>
                    </div>

                    <div className="p-2 text-stone-400">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Expanded Branch Content */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/50 space-y-4 animate-in slide-in-from-top-1 duration-200">
                      {/* 48px+ Touch Buttons for Brother & Spouse */}
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          onClick={() => onSelectMember(branch.id)}
                          className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>
                            {language === "hi"
                              ? `${tName(branch.name)} के विवरण व दस्तावेज़`
                              : `${branch.name}'s Profile & Docs`}
                          </span>
                        </button>

                        {branch.spouse && (
                          <button
                            onClick={() => onSelectMember(branch.spouse!.id)}
                            className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl bg-white border border-stone-300 hover:border-amber-400 text-stone-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                          >
                            <FileText className="w-4 h-4 text-amber-900" />
                            <span>
                              {tName(branch.spouse.name)} ({language === "hi" ? "पत्नी" : "Wife"})
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Children List */}
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          {language === "hi" ? "बच्चे व पोते-पोतियां" : "Children & Grandchildren:"}
                        </div>

                        <div className="space-y-2">
                          {branch.children.map((child) => (
                            <div
                              key={child.id}
                              className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-2xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="font-bold text-sm text-stone-900">
                                    {tName(child.name)}
                                  </div>
                                  {child.spouse && (
                                    <div className="text-xs text-stone-500 mt-0.5">
                                      {language === "hi" ? "विवाहित" : "Married to"}: <strong>{tName(child.spouse.name)}</strong>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => onSelectMember(child.id)}
                                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-100/70 hover:bg-amber-200/70 text-amber-950 text-xs font-semibold border border-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5 text-amber-800" />
                                  <span>{language === "hi" ? "विवरण / दस्तावेज़" : "Profile & Docs"}</span>
                                </button>
                              </div>

                              {/* Grandchildren Pills */}
                              {child.children && child.children.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-stone-100">
                                  <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">
                                    {language === "hi" ? "बच्चे" : "Children"}:
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {child.children.map((gc) => (
                                      <button
                                        key={gc.id}
                                        onClick={() => onSelectMember(gc.id)}
                                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-800 text-xs font-medium border border-stone-200 cursor-pointer transition-colors"
                                      >
                                        {tName(gc.name)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
