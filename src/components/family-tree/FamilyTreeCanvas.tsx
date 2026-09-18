"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { TreeLayoutResult, TreeNode, TreeEdge } from "@/lib/tree-layout";
import { FamilyMember } from "@/types";

interface FamilyTreeCanvasProps {
  layout: TreeLayoutResult;
  members: FamilyMember[];
  onSelectMember: (id: string) => void;
  selectedMemberId: string | null;
}

export function FamilyTreeCanvas({
  layout,
  members,
  onSelectMember,
  selectedMemberId,
}: FamilyTreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport Transform State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Mobile Mode Toggle
  const [viewMode, setViewMode] = useState<"canvas" | "mobile_explorer">("canvas");
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({
    mohammad: true,
    akhtar: true,
    shakur: true,
    sattar: true,
    mukhtar: true,
  });

  // Search in tree
  const [treeSearch, setTreeSearch] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Fit to screen calculation
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !layout.bounds) return;
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    const treeW = layout.bounds.width;
    const treeH = layout.bounds.height;

    if (treeW === 0 || treeH === 0) return;

    // Determine scale with margin
    const scaleX = (containerW - 80) / treeW;
    const scaleY = (containerH - 80) / treeH;
    const initialScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.1);

    const initialPanX = (containerW - treeW * initialScale) / 2 - layout.bounds.minX * initialScale;
    const initialPanY = 40 - layout.bounds.minY * initialScale;

    setZoom(initialScale);
    setPan({ x: initialPanX, y: initialPanY });
  }, [layout]);

  // Initial fit on load
  useEffect(() => {
    handleFitToScreen();
    // Auto-detect small mobile screens on mount
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("mobile_explorer");
    }
  }, [handleFitToScreen]);

  // Center on node if selected
  useEffect(() => {
    if (selectedMemberId && containerRef.current) {
      const node = layout.nodes.find((n) => n.id === selectedMemberId);
      if (node) {
        const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
        const targetX = containerW / 2 - (node.x + node.width / 2) * zoom;
        const targetY = containerH / 2 - (node.y + node.height / 2) * zoom;
        setPan({ x: targetX, y: targetY });
      }
    }
  }, [selectedMemberId, layout.nodes, zoom]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
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
    const found = members.find(
      (m) =>
        m.first_name.toLowerCase().includes(treeSearch.toLowerCase()) ||
        (m.nickname && m.nickname.toLowerCase().includes(treeSearch.toLowerCase()))
    );
    if (found) {
      setHighlightedId(found.id);
      onSelectMember(found.id);
    }
  };

  const toggleBranch = (id: string) => {
    setExpandedBranches((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col bg-[#FAF7F2] overflow-hidden select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
        {/* Search & Mode Switch */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-stone-200/80 text-xs w-48 sm:w-64"
          >
            <Search className="w-3.5 h-3.5 text-stone-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              placeholder="Find person in tree..."
              className="w-full bg-transparent text-stone-800 placeholder-stone-400 outline-none text-xs"
            />
          </form>

          <button
            onClick={() =>
              setViewMode((prev) => (prev === "canvas" ? "mobile_explorer" : "canvas"))
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-stone-200/80 shadow-md text-xs font-semibold text-stone-700 hover:text-amber-800 hover:bg-white transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">
              {viewMode === "canvas" ? "Compact Explorer" : "Full Interactive Tree"}
            </span>
            <span className="sm:hidden">{viewMode === "canvas" ? "Explorer" : "Tree"}</span>
          </button>
        </div>

        {/* Zoom & Fit Controls (visible in canvas mode) */}
        {viewMode === "canvas" && (
          <div className="flex items-center gap-1.5 pointer-events-auto bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-md border border-stone-200/80">
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.2, 2.2))}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z * 0.8, 0.25))}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 text-[11px] font-semibold text-stone-500 border-l border-stone-200">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        )}
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
        </div>
      ) : (
        /* Mobile Compact Branch Navigator (Section 65) */
        <div className="w-full h-full overflow-y-auto p-4 sm:p-6 pb-20 max-w-2xl mx-auto space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold text-sm mb-1 flex items-center gap-1.5">
              <span>🌳</span> Compact Family Hierarchy
            </p>
            Explore each branch generation by generation. Tap any family member to view their profile, documents, and kinship.
          </div>

          {/* Root Generation 1: Mohammad & Hamida */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Generation 1 — Grandparents
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                onClick={() => onSelectMember("mohammad")}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-left hover:border-amber-400 transition-all"
              >
                <div className="font-semibold text-stone-900 text-sm">Mohammad</div>
                <div className="text-xs text-stone-500">Grandfather • 🕊️ Deceased</div>
              </button>

              <button
                onClick={() => onSelectMember("hamida")}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-left hover:border-amber-400 transition-all"
              >
                <div className="font-semibold text-stone-900 text-sm">Hamida</div>
                <div className="text-xs text-stone-500">Grandmother</div>
              </button>
            </div>
          </div>

          {/* Generation 2 Branches (Akhtar, Shakur, Sattar, Mukhtar in exact order) */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 px-1">
              Generation 2 — Siblings & Descendants
            </div>

            {/* Akhtar's Family */}
            <div className="bg-white rounded-2xl border border-amber-300 shadow-sm overflow-hidden">
              <div
                onClick={() => toggleBranch("akhtar")}
                className="p-4 bg-gradient-to-r from-amber-50/80 to-white flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-900 text-sm">1. Akhtar</h3>
                    <span className="text-xs text-amber-800 font-semibold">(Bade Pappa)</span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> Lead
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">Spouse: Afroz • 3 Children</p>
                </div>
                {expandedBranches.akhtar ? (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                )}
              </div>

              {expandedBranches.akhtar && (
                <div className="p-4 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectMember("akhtar")}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      View Akhtar
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => onSelectMember("afroz")}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      View Afroz (Spouse)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {/* Naziya */}
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("naziya")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Naziya (+ Azhar)
                      </button>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Children: Atiqa, Maira
                      </div>
                    </div>
                    {/* Mussavir */}
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("mussavir")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Mussavir (+ Saniya)
                      </button>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Child: Yazdan (Baby boy)
                      </div>
                    </div>
                    {/* Arshiya */}
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("arshiya")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Arshiya (+ Sharukh)
                      </button>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Children: Kabir, Umar
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shakur's Family */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div
                onClick={() => toggleBranch("shakur")}
                className="p-4 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-900 text-sm">2. Shakur</h3>
                    <span className="text-xs text-stone-500">(Elder Uncle)</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">Spouse: Chinni • 4 Children</p>
                </div>
                {expandedBranches.shakur ? (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                )}
              </div>

              {expandedBranches.shakur && (
                <div className="p-4 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectMember("shakur")}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      View Shakur
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => onSelectMember("chinni")}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      View Chinni (Spouse)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("eram")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Eram (Unmarried)
                      </button>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("saba")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Saba (+ Farukh)
                      </button>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Children: Zikra, Aarish
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("sana")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Sana (+ Altaf)
                      </button>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Children: Alvina, Alian
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("tasmiya")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Tasmiya (+ Tayyab)
                      </button>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Child: Azlan (Male)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sattar's Family */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div
                onClick={() => toggleBranch("sattar")}
                className="p-4 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-900 text-sm">3. Sattar</h3>
                    <span className="text-xs text-stone-500">(Uncle)</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">Spouse: Guddi • 2 Children</p>
                </div>
                {expandedBranches.sattar ? (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                )}
              </div>

              {expandedBranches.sattar && (
                <div className="p-4 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectMember("sattar")}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      View Sattar
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => onSelectMember("guddi")}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      View Guddi (Spouse)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("junaid")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Junaid (+ Sufiya)
                      </button>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Child: Hamdan (Male)
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("misbah")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Misbah (+ Tanveer)
                      </button>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Child: Zoya (Female)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mukhtar's Family */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div
                onClick={() => toggleBranch("mukhtar")}
                className="p-4 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-900 text-sm">4. Mukhtar</h3>
                    <span className="text-xs text-stone-500">(Youngest Brother)</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">Spouse: Shabana • 2 Children</p>
                </div>
                {expandedBranches.mukhtar ? (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                )}
              </div>

              {expandedBranches.mukhtar && (
                <div className="p-4 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectMember("mukhtar")}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      View Mukhtar
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => onSelectMember("shabana")}
                      className="text-xs font-medium text-amber-800 hover:underline"
                    >
                      View Shabana (Spouse)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("mustafa")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Mustafa
                      </button>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <button
                        onClick={() => onSelectMember("sharmin")}
                        className="font-medium text-stone-900 text-xs hover:text-amber-800"
                      >
                        Sharmin (+ Sameer)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
