"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import {
  FileText,
  Printer,
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  X,
  QrCode,
  Users,
  Download,
  Share2,
  Loader2,
} from "lucide-react";
import { FamilyMember, Marriage, Relationship } from "@/types";
import { useLanguage } from "@/lib/i18n";
import Link from "next/link";

interface MemberIdCardProps {
  member: FamilyMember;
  allMembers?: FamilyMember[];
  marriages?: Marriage[];
  relationships?: Relationship[];
  kinship?: {
    spouse: FamilyMember | null;
    children: FamilyMember[];
    father: FamilyMember | null;
    mother: FamilyMember | null;
  };
  onClose?: () => void;
}

// Pure SVG Heritage Tree Emblem in antique gold
function HeritageTreeCrest({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Trunk & Branches */}
      <path
        d="M60 102 C58 92 56 80 54 70 C52 64 46 58 38 52 C35 50 38 48 42 50 C48 54 54 60 56 66 C57 60 55 52 48 42 C45 38 48 36 52 39 C57 44 60 52 60 58 C60 52 63 44 68 39 C72 36 75 38 72 42 C65 52 63 60 64 66 C66 60 72 54 78 50 C82 48 85 50 82 52 C74 58 68 64 66 70 C64 80 62 92 60 102 Z"
        fill="#C6A15B"
      />
      {/* Roots */}
      <path
        d="M58 98 C54 104 46 108 36 110 C34 110 35 108 37 107 C44 105 52 101 56 97 Z"
        fill="#C6A15B"
      />
      <path
        d="M62 98 C66 104 74 108 84 110 C86 110 85 108 83 107 C76 105 68 101 64 97 Z"
        fill="#C6A15B"
      />
      <path
        d="M60 100 C59 105 57 110 53 114 C51 114 53 112 55 109 C57 106 59 102 60 100 Z"
        fill="#C6A15B"
      />
      <path
        d="M60 100 C61 105 63 110 67 114 C69 114 67 112 65 109 C63 106 61 102 60 100 Z"
        fill="#C6A15B"
      />

      {/* Foliage / Leaves Cluster */}
      <ellipse cx="60" cy="22" rx="4.5" ry="9" fill="#D8B46B" />
      <ellipse cx="50" cy="25" rx="4" ry="8" fill="#C6A15B" transform="rotate(-25 50 25)" />
      <ellipse cx="70" cy="25" rx="4" ry="8" fill="#C6A15B" transform="rotate(25 70 25)" />
      <ellipse cx="42" cy="32" rx="4" ry="8" fill="#D8B46B" transform="rotate(-45 42 32)" />
      <ellipse cx="78" cy="32" rx="4" ry="8" fill="#D8B46B" transform="rotate(45 78 32)" />
      <ellipse cx="36" cy="42" rx="4" ry="8" fill="#C6A15B" transform="rotate(-65 36 42)" />
      <ellipse cx="84" cy="42" rx="4" ry="8" fill="#C6A15B" transform="rotate(65 84 42)" />
      <ellipse cx="32" cy="54" rx="3.5" ry="7" fill="#D8B46B" transform="rotate(-85 32 54)" />
      <ellipse cx="88" cy="54" rx="3.5" ry="7" fill="#D8B46B" transform="rotate(85 88 54)" />

      {/* Inner Canopy Clusters */}
      <ellipse cx="60" cy="36" rx="4" ry="7.5" fill="#D8B46B" />
      <ellipse cx="52" cy="37" rx="3.5" ry="7" fill="#C6A15B" transform="rotate(-20 52 37)" />
      <ellipse cx="68" cy="37" rx="3.5" ry="7" fill="#C6A15B" transform="rotate(20 68 37)" />
      <ellipse cx="45" cy="45" rx="3.5" ry="7" fill="#D8B46B" transform="rotate(-40 45 45)" />
      <ellipse cx="75" cy="45" rx="3.5" ry="7" fill="#D8B46B" transform="rotate(40 75 45)" />
      <ellipse cx="58" cy="48" rx="3.5" ry="6.5" fill="#C6A15B" />
      <ellipse cx="62" cy="48" rx="3.5" ry="6.5" fill="#C6A15B" />

      {/* Upper outer canopy dots / leaves */}
      <circle cx="60" cy="10" r="2.8" fill="#E2C78A" />
      <circle cx="48" cy="14" r="2.8" fill="#D8B46B" />
      <circle cx="72" cy="14" r="2.8" fill="#D8B46B" />
      <circle cx="38" cy="20" r="2.8" fill="#C6A15B" />
      <circle cx="82" cy="20" r="2.8" fill="#C6A15B" />
      <circle cx="28" cy="32" r="2.8" fill="#D8B46B" />
      <circle cx="92" cy="32" r="2.8" fill="#D8B46B" />
      <circle cx="24" cy="46" r="2.5" fill="#C6A15B" />
      <circle cx="96" cy="46" r="2.5" fill="#C6A15B" />
    </svg>
  );
}

// Pure SVG Arabesque Jali Band for bottom edge
function ArabesqueJaliBand() {
  return (
    <div
      className="w-full h-3.5 sm:h-4 relative overflow-hidden flex items-center border-t border-[#C6A15B]/80 flex-shrink-0"
      style={{
        backgroundColor: "#0E382F",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Absolute vector fill ensures browser print engines never strip the deep green background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <rect width="100" height="100" fill="#0E382F" />
      </svg>
      <svg
        className="w-full h-full opacity-45 relative z-10"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="jali-pattern"
            width="24"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 12 0 L 24 8 L 12 16 L 0 8 Z"
              fill="none"
              stroke="#D8B46B"
              strokeWidth="0.8"
            />
            <circle cx="12" cy="8" r="2.5" fill="none" stroke="#D8B46B" strokeWidth="0.7" />
            <path d="M 0 0 L 6 4 M 24 0 L 18 4 M 0 16 L 6 12 M 24 16 L 18 12" stroke="#D8B46B" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#jali-pattern)" />
      </svg>
    </div>
  );
}

// Subtle Islamic Heritage Architecture Silhouette Watermark (Mosque dome & minaret)
function ArchitectureWatermark() {
  return (
    <svg
      viewBox="0 0 400 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute right-0 bottom-3 w-72 h-36 pointer-events-none opacity-[0.09]"
    >
      <path d="M330 200 L330 60 L327 60 L327 45 L330 45 L330 25 L332 20 L334 25 L334 45 L337 45 L337 60 L334 60 L334 200 Z" fill="#8C7A63" />
      <circle cx="332" cy="16" r="2" fill="#8C7A63" />
      <path d="M220 200 L220 140 C220 115 240 90 260 85 C280 90 300 115 300 140 L300 200 Z" fill="#8C7A63" />
      <path d="M260 85 L260 70 L258 70 L260 65 L262 70 L260 70 Z" fill="#8C7A63" />
      <path d="M170 200 L170 155 C170 135 185 120 200 115 C215 120 230 135 230 155 L230 200 Z" fill="#8C7A63" />
      <path d="M80 200 C120 175 160 170 200 175 C240 180 280 190 360 195 L360 200 Z" fill="#8C7A63" />
    </svg>
  );
}

export function MemberIdCard({
  member,
  allMembers = [],
  marriages = [],
  relationships = [],
  kinship,
  onClose,
}: MemberIdCardProps) {
  const { tName } = useLanguage();
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  // Pre-load photo as base64 to guarantee 0-taint high-resolution PDF rendering
  useEffect(() => {
    const rawPhoto = member.photo_url || member.profile_photo;
    if (!rawPhoto) {
      setPhotoBase64(null);
      return;
    }
    if (rawPhoto.startsWith("data:")) {
      setPhotoBase64(rawPhoto);
      return;
    }
    fetch(rawPhoto)
      .then((res) => {
        if (!res.ok) throw new Error("Photo fetch failed");
        return res.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        console.warn("Could not pre-load photo as base64 data url:", err);
      });
  }, [member.photo_url, member.profile_photo]);

  // Authoritative Kinship state (spouse, children, parents)
  const [fetchedKinship, setFetchedKinship] = useState<{
    spouse: FamilyMember | null;
    children: FamilyMember[];
    father: FamilyMember | null;
    mother: FamilyMember | null;
  } | null>(kinship || null);

  // Automatically fetch kinship from API if not provided
  useEffect(() => {
    if (kinship) {
      setFetchedKinship(kinship);
      return;
    }
    // Fetch authoritative server record
    fetch(`/api/members/${member.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.kinship) {
          setFetchedKinship(data.kinship);
        }
      })
      .catch((err) => console.error("Error fetching authoritative member kinship:", err));
  }, [member.id, kinship]);

  // Derive permanent URL for QR code
  const [docUrl, setDocUrl] = useState<string>(`/documents?person=${member.id}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const fullUrl = `${origin}/documents?person=${member.id}`;
      setDocUrl(fullUrl);

      // High-error correction QR code with centered emblem
      QRCode.toDataURL(fullUrl, {
        width: 360,
        margin: 1,
        color: {
          dark: "#171714",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Generation error:", err));
    }
  }, [member.id]);

  // Member map for local lookups
  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    allMembers.forEach((m) => map.set(m.id, m));
    return map;
  }, [allMembers]);

  // Parents
  const parentRels = relationships.filter(
    (r) => r.related_person_id === member.id && r.relationship_type === "child"
  );
  const father =
    fetchedKinship?.father ||
    parentRels.map((r) => memberMap.get(r.person_id)).find((p) => p?.gender === "male") ||
    null;
  const mother =
    fetchedKinship?.mother ||
    parentRels.map((r) => memberMap.get(r.person_id)).find((p) => p?.gender === "female") ||
    null;

  // Spouse: Authoritative from fetchedKinship first, then fallback to marriages table
  const marriage = marriages.find(
    (m) =>
      (m.person1_id === member.id || m.person2_id === member.id) &&
      m.status !== "separated"
  );
  const spouseId = marriage
    ? marriage.person1_id === member.id
      ? marriage.person2_id
      : marriage.person1_id
    : null;
  const spouse = fetchedKinship?.spouse || (spouseId ? memberMap.get(spouseId) : null);

  // Children: Authoritative from fetchedKinship first, then fallback to relationships table
  const childRels = relationships.filter(
    (r) => r.person_id === member.id && r.relationship_type === "child"
  );
  const children =
    fetchedKinship?.children && fetchedKinship.children.length > 0
      ? fetchedKinship.children
      : childRels
          .map((r) => memberMap.get(r.related_person_id))
          .filter((m): m is FamilyMember => Boolean(m));

  // Authoritative Full Name
  const fullName = [member.first_name, member.middle_name, member.last_name || "Pinjari"]
    .filter(Boolean)
    .join(" ");

  // Stored Hindi Name
  const hindiFirst = tName(member.first_name);
  const hindiName = hindiFirst !== member.first_name ? `${hindiFirst} पिंजारी` : null;

  // Authoritative Role mapping
  const displayRole = useMemo(() => {
    if (member.is_family_lead === 1) {
      return member.nickname
        ? `Family Lead (${member.nickname})`
        : "Family Lead";
    }
    if (member.family_role) {
      return member.nickname
        ? `${member.family_role} (${member.nickname})`
        : member.family_role;
    }
    if (father) {
      return member.gender === "female"
        ? `Daughter of ${father.first_name}`
        : `Son of ${father.first_name}`;
    }
    if (spouse) {
      return member.gender === "female"
        ? `Spouse of ${spouse.first_name}`
        : `Husband of ${spouse.first_name}`;
    }
    return null;
  }, [member, father, spouse]);

  // Generation Display: e.g. "Gen 2 (Second)" or "Gen 3 (Third)"
  const generationOrdinals: Record<number, string> = {
    1: "First",
    2: "Second",
    3: "Third",
    4: "Fourth",
    5: "Fifth",
  };
  const genDisplay = member.generation
    ? `Gen ${member.generation}${
        generationOrdinals[member.generation]
          ? ` (${generationOrdinals[member.generation]})`
          : ""
      }`
    : null;

  // Authoritative Member Identifier / Branch Code (e.g. PINJ-G2-AKHTAR)
  const branchCode = `PINJ-G${member.generation || 1}-${member.id.toUpperCase()}`;

  // Member Since Year
  const memberSinceYear = member.created_at
    ? new Date(member.created_at).getFullYear()
    : "2024";

  const copyPermanentLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(docUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Dedicated High-Resolution Color PDF Download to Share (Front & Back)
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      // Use the dedicated flat capture containers to bypass 3D rotation / CSS transform bugs
      const frontElement = document.getElementById(`pdf-capture-front-${member.id}`);
      const backElement = document.getElementById(`pdf-capture-back-${member.id}`);

      if (!frontElement || !backElement) {
        throw new Error("Card capture elements not found in DOM");
      }

      // Capture front and back in high resolution
      const frontCanvas = await html2canvas(frontElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#FAF7F0",
        logging: false,
      });

      const backCanvas = await html2canvas(backElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#FAF7F0",
        logging: false,
      });

      // Standard ID card size: 85.6mm x 53.98mm (ISO/IEC 7810 ID-1)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98],
      });

      // Page 1: Front
      const frontImgData = frontCanvas.toDataURL("image/png");
      pdf.addImage(frontImgData, "PNG", 0, 0, 85.6, 53.98, undefined, "FAST");

      // Page 2: Back
      pdf.addPage([85.6, 53.98], "landscape");
      const backImgData = backCanvas.toDataURL("image/png");
      pdf.addImage(backImgData, "PNG", 0, 0, 85.6, 53.98, undefined, "FAST");

      const fileName = `${member.first_name}_Pinjari_Heritage_ID_Card.pdf`;

      // Save PDF directly to user's device
      pdf.save(fileName);

      // Web Share API on mobile (WhatsApp, Messages, Drive)
      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const pdfBlob = pdf.output("blob");
          const file = new File([pdfBlob], fileName, { type: "application/pdf" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${member.first_name} Pinjari - Official Family ID Card`,
              text: `Pinjari Heritage Archive ID Card for ${member.first_name} Pinjari`,
              files: [file],
            });
          }
        } catch {
          // Sharing is optional; file is already downloaded
        }
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      // If direct PDF export fails, inform user and open print dialog
      alert("Direct PDF generation encountered an issue. Opening standard print window where you can choose 'Save as PDF'.");
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const resolvedPhoto = photoBase64 || member.photo_url || member.profile_photo;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Top Toolbar (Non-printable) */}
      <div className="w-full flex items-center justify-between gap-2 mb-4 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-serif font-bold px-3 py-1 rounded-full bg-[#123B32]/10 text-[#123B32] border border-[#123B32]/20 tracking-wide">
            PINJARI HERITAGE ARCHIVE
          </span>
          <span className="text-xs text-stone-500 font-mono hidden sm:inline">
            {branchCode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Flip Toggle */}
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs border border-stone-200"
            title="Flip card between Front and Back"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isFlipped ? "Show Front" : "Show Back"}</span>
          </button>

          {/* High-Resolution PDF Download to Share */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 rounded-xl bg-[#123B32] hover:bg-[#0c2a23] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
            title="Download crisp 2-page color PDF formatted to share on WhatsApp or print"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D8B46B]" />
                <span>Generating Color PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#D8B46B]" />
                <span>Download Color PDF</span>
              </>
            )}
          </button>

          {/* Print Card */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Print ID Card"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive 3D Card Container on Screen (Hidden on Print) */}
      <div
        className="w-full relative [perspective:1400px] select-none print:hidden id-card-screen-only"
        style={{ minHeight: "380px" }}
      >
        <div
          className={`w-full transition-transform duration-700 [transform-style:preserve-3d] relative ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
          style={{ minHeight: "380px" }}
        >
          {/* ======================= SCREEN CARD FRONT ======================= */}
          <div
            id={`id-card-front-${member.id}`}
            className="w-full rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl border-2 border-[#C6A15B]/60 flex flex-col justify-between [backface-visibility:hidden] relative"
            style={{
              aspectRatio: "1.586 / 1",
              minHeight: "380px",
              backgroundColor: "#FAF7F0",
            }}
          >
            <CardFrontContent
              member={member}
              fullName={fullName}
              hindiName={hindiName}
              displayRole={displayRole}
              genDisplay={genDisplay}
              branchCode={branchCode}
              memberSinceYear={memberSinceYear}
              qrDataUrl={qrDataUrl}
              photoSrc={resolvedPhoto}
            />
          </div>

          {/* ======================= SCREEN CARD BACK ======================= */}
          <div
            id={`id-card-back-${member.id}`}
            className="w-full rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl border-2 border-[#C6A15B]/60 absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between"
            style={{
              aspectRatio: "1.586 / 1",
              minHeight: "380px",
              backgroundColor: "#FAF7F0",
            }}
          >
            <CardBackContent
              member={member}
              fullName={fullName}
              father={father || null}
              spouse={spouse || null}
              childrenList={children}
              branchCode={branchCode}
            />
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* DEDICATED FLAT CAPTURE CONTAINER FOR HIGH-RES PDF EXPORT (OFF-SCREEN) */}
      {/* ================================================================ */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "680px",
          opacity: 1,
          zIndex: -9999,
          pointerEvents: "none",
        }}
      >
        {/* Front Flat Capture */}
        <div
          id={`pdf-capture-front-${member.id}`}
          style={{
            width: "680px",
            height: "428px",
            backgroundColor: "#FAF7F0",
            borderRadius: "24px",
            overflow: "hidden",
            border: "2px solid #C6A15B",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <CardFrontContent
            member={member}
            fullName={fullName}
            hindiName={hindiName}
            displayRole={displayRole}
            genDisplay={genDisplay}
            branchCode={branchCode}
            memberSinceYear={memberSinceYear}
            qrDataUrl={qrDataUrl}
            photoSrc={resolvedPhoto}
          />
        </div>

        {/* Back Flat Capture */}
        <div
          id={`pdf-capture-back-${member.id}`}
          style={{
            width: "680px",
            height: "428px",
            backgroundColor: "#FAF7F0",
            borderRadius: "24px",
            overflow: "hidden",
            border: "2px solid #C6A15B",
            position: "relative",
            marginTop: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <CardBackContent
            member={member}
            fullName={fullName}
            father={father || null}
            spouse={spouse || null}
            childrenList={children}
            branchCode={branchCode}
          />
        </div>
      </div>

      {/* ================================================================ */}
      {/* DEDICATED PRINT SHEET: Flawlessly prints BOTH Front & Back with guaranteed colors */}
      {/* ================================================================ */}
      <div className="hidden print:flex flex-col gap-6 w-full max-w-xl mx-auto my-0 p-0 id-card-print-target">
        <div
          className="w-full rounded-[20px] overflow-hidden border-2 border-[#C6A15B] flex flex-col justify-between shadow-none relative"
          style={{
            aspectRatio: "1.586 / 1",
            backgroundColor: "#FAF7F0",
            pageBreakInside: "avoid",
          }}
        >
          <CardFrontContent
            member={member}
            fullName={fullName}
            hindiName={hindiName}
            displayRole={displayRole}
            genDisplay={genDisplay}
            branchCode={branchCode}
            memberSinceYear={memberSinceYear}
            qrDataUrl={qrDataUrl}
            photoSrc={resolvedPhoto}
          />
        </div>

        <div
          className="w-full rounded-[20px] overflow-hidden border-2 border-[#C6A15B] flex flex-col justify-between shadow-none relative"
          style={{
            aspectRatio: "1.586 / 1",
            backgroundColor: "#FAF7F0",
            pageBreakInside: "avoid",
          }}
        >
          <CardBackContent
            member={member}
            fullName={fullName}
            father={father || null}
            spouse={spouse || null}
            childrenList={children}
            branchCode={branchCode}
          />
        </div>
      </div>

      {/* Quick Action Navigation Buttons Under Card (Non-printable) */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 print:hidden">
        {/* Direct Link to Member's Documents */}
        <Link
          href={`/documents?person=${member.id}`}
          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#123B32] hover:bg-[#0c2a23] text-[#D8B46B] font-serif font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
        >
          <FileText className="w-4 h-4 text-[#D8B46B]" />
          <span>Open {member.first_name}&apos;s Documents Cupboard</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </Link>

        {/* Copy Document Link */}
        <button
          onClick={copyPermanentLink}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-bold">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-stone-500" />
              <span>Copy Permanent QR Link</span>
            </>
          )}
        </button>
      </div>

      {/* Helper Note */}
      <p className="text-[11px] text-stone-500 text-center mt-3 print:hidden">
        💡 <strong>Authoritative Kinship:</strong> Showing {member.first_name}&apos;s spouse &amp; children from database records.
        Click <strong>Download Color PDF</strong> to generate a high-resolution 2-sided identity card PDF for WhatsApp or printing.
      </p>
    </div>
  );
}

// Reusable Front Face Content
function CardFrontContent({
  member,
  fullName,
  hindiName,
  displayRole,
  genDisplay,
  branchCode,
  memberSinceYear,
  qrDataUrl,
  photoSrc,
}: {
  member: FamilyMember;
  fullName: string;
  hindiName: string | null;
  displayRole: string | null;
  genDisplay: string | null;
  branchCode: string;
  memberSinceYear: string | number;
  qrDataUrl: string;
  photoSrc?: string | null;
}) {
  const currentPhoto = photoSrc || member.photo_url || member.profile_photo;

  return (
    <>
      <div className="flex-1 flex w-full relative z-10">
        {/* Left Heritage Panel (~28% width) */}
        <div
          className="w-[28%] sm:w-[27%] text-[#D8B46B] p-3 sm:p-5 flex flex-col justify-between items-center text-center relative border-r border-[#C6A15B]/50 overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: "#0E382F",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Absolute vector fill ensures browser print engines never strip the deep green background */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <rect width="100" height="100" fill="#0E382F" />
          </svg>

          <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(#D8B46B_1.5px,transparent_1.5px)] [background-size:14px_14px]" />

          {/* Top Tree Crest & Title */}
          <div className="relative z-10 flex flex-col items-center pt-1">
            <HeritageTreeCrest className="w-14 h-14 sm:w-16 sm:h-16 mb-1 drop-shadow-xs" />
            <h2 className="text-base sm:text-lg font-serif font-black tracking-[0.22em] text-[#D8B46B] uppercase leading-tight">
              PINJAR
            </h2>
            <h2 className="text-base sm:text-lg font-serif font-black tracking-[0.22em] text-[#D8B46B] uppercase leading-tight">
              BADDA
            </h2>

            <div className="w-10 h-[1px] bg-[#C6A15B]/70 my-2" />

            <p className="text-[7.5px] sm:text-[8.5px] font-serif font-semibold tracking-[0.22em] text-[#C6A15B] uppercase leading-snug">
              OUR FAMILY
            </p>
            <p className="text-[7.5px] sm:text-[8.5px] font-serif font-semibold tracking-[0.22em] text-[#C6A15B] uppercase leading-snug">
              OUR STRENGTH
            </p>
          </div>

          {/* Middle Pillars / Core Values */}
          <div className="relative z-10 flex flex-col items-center space-y-1.5 sm:space-y-2 py-1">
            <span className="text-[7px] sm:text-[8px] font-sans font-medium tracking-[0.28em] text-[#C6A15B]/90 uppercase">
              HERITAGE
            </span>
            <span className="text-[7px] sm:text-[8px] font-sans font-medium tracking-[0.28em] text-[#C6A15B]/90 uppercase">
              UNITY
            </span>
            <span className="text-[7px] sm:text-[8px] font-sans font-medium tracking-[0.28em] text-[#C6A15B]/90 uppercase">
              SUPPORT
            </span>
            <span className="text-[7px] sm:text-[8px] font-sans font-medium tracking-[0.28em] text-[#C6A15B]/90 uppercase">
              PROGRESS
            </span>
          </div>

          {/* Bottom Calligraphy Script */}
          <div className="relative z-10 pb-1">
            <p className="font-serif italic text-xs sm:text-sm text-[#E2C78A] leading-tight tracking-wide">
              Ek Khuda
            </p>
            <p className="font-serif italic text-xs sm:text-sm text-[#E2C78A] leading-tight tracking-wide">
              Ek Parivar
            </p>
          </div>
        </div>

        {/* Right Main Panel (~72% width) */}
        <div
          className="flex-1 p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden"
          style={{
            backgroundColor: "#FAF7F0",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {/* Parchment Vector Background */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <rect width="100" height="100" fill="#FAF7F0" />
          </svg>

          <ArchitectureWatermark />

          {/* Header Bar */}
          <div className="relative z-10 flex items-start justify-between border-b border-[#C6A15B]/30 pb-2.5">
            <div>
              <h1 className="text-xs sm:text-[13px] md:text-sm font-serif font-bold text-[#171714] tracking-[0.24em] uppercase leading-tight">
                PINJARI HERITAGE ARCHIVE
              </h1>
              <p className="text-[8px] sm:text-[9px] font-sans font-semibold tracking-[0.3em] text-[#78716C] uppercase mt-0.5">
                FAMILY MEMBER ID
              </p>
            </div>

            <div className="text-right">
              <p className="text-[7px] sm:text-[8px] font-sans font-bold tracking-[0.2em] text-[#57534E] uppercase">
                ROOTED IN VALUES
              </p>
              <p className="text-[7px] sm:text-[8px] font-sans font-bold tracking-[0.2em] text-[#57534E] uppercase">
                TOGETHER ALWAYS
              </p>
              <div className="w-12 h-[1px] bg-[#C6A15B] mt-1 ml-auto" />
            </div>
          </div>

          {/* Middle Body: Portrait + Details + QR Code */}
          <div className="relative z-10 grid grid-cols-12 gap-3 sm:gap-4 my-auto py-2 items-center">
            {/* Portrait Frame */}
            <div className="col-span-4 sm:col-span-4 flex justify-start">
              <div className="w-24 h-28 sm:w-28 sm:h-34 rounded-xl p-1 bg-white border border-[#C6A15B] shadow-sm relative overflow-hidden flex-shrink-0">
                <div className="w-full h-full rounded-lg bg-[#EFE9DF] overflow-hidden flex items-center justify-center relative">
                  {currentPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentPhoto}
                      alt={member.first_name}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#8C7A63]">
                      <span className="font-serif font-bold text-2xl sm:text-3xl text-[#123B32]">
                        {member.first_name.charAt(0)}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest font-sans mt-1 text-[#8C7A63]">
                        MEMBER
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Member Details */}
            <div className="col-span-5 sm:col-span-5 text-left flex flex-col justify-center space-y-1.5 pl-0 sm:pl-1">
              <div>
                <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] font-semibold text-[#8C7A63] block">
                  NAME
                </span>
                <h2 className="text-base sm:text-lg md:text-xl font-serif font-bold text-[#171714] tracking-tight leading-snug">
                  {fullName}
                </h2>
                {hindiName && (
                  <p className="text-[11px] sm:text-xs text-[#57534E] font-medium leading-none mt-0.5">
                    {hindiName}
                  </p>
                )}
              </div>

              {displayRole && (
                <div>
                  <span className="text-[8px] sm:text-[8.5px] uppercase tracking-[0.2em] font-semibold text-[#8C7A63] block">
                    ROLE
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-[#171714] leading-tight">
                    {displayRole}
                  </p>
                </div>
              )}

              <div className="flex items-center pt-0.5">
                {genDisplay && (
                  <div>
                    <span className="text-[7.5px] sm:text-[8px] uppercase tracking-[0.18em] font-semibold text-[#8C7A63] block">
                      GENERATION
                    </span>
                    <p className="text-[11px] sm:text-xs font-semibold text-[#171714]">
                      {genDisplay}
                    </p>
                  </div>
                )}

                {genDisplay && branchCode && (
                  <div className="h-6 w-[1px] bg-[#C6A15B]/50 mx-2.5 sm:mx-3" />
                )}

                {branchCode && (
                  <div>
                    <span className="text-[7.5px] sm:text-[8px] uppercase tracking-[0.18em] font-semibold text-[#8C7A63] block">
                      BRANCH
                    </span>
                    <p className="text-[11px] sm:text-xs font-semibold text-[#171714] font-mono tracking-tight">
                      {branchCode}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="col-span-3 sm:col-span-3 flex flex-col items-center justify-center text-center">
              <div className="p-1 sm:p-1.5 bg-white rounded-2xl border border-[#C6A15B] shadow-xs relative group">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`QR for ${member.first_name}`}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-stone-100 flex items-center justify-center text-stone-400">
                    <QrCode className="w-6 h-6 animate-pulse" />
                  </div>
                )}

                {/* Tree emblem in QR center */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-5 h-5 rounded-full bg-[#FAF7F0] border border-[#C6A15B] flex items-center justify-center shadow-xs">
                    <HeritageTreeCrest className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="mt-1 leading-tight">
                <span className="text-[7px] sm:text-[7.5px] font-bold text-[#57534E] uppercase tracking-[0.18em] block">
                  SCAN TO ACCESS
                </span>
                <span className="text-[7px] sm:text-[7.5px] font-bold text-[#57534E] uppercase tracking-[0.18em] block">
                  DOCUMENTS
                </span>
              </div>
            </div>
          </div>

          {/* Family Motto */}
          <div className="relative z-10 flex items-center gap-2 py-1">
            <div className="w-5 h-5 rounded-full bg-[#C6A15B]/15 flex items-center justify-center flex-shrink-0">
              <Users className="w-3 h-3 text-[#C6A15B]" />
            </div>
            <div>
              <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.2em] text-[#8C7A63] block">
                FAMILY IS OUR IDENTITY
              </span>
              <p className="text-[9px] sm:text-[10px] font-serif italic text-[#443F38] leading-tight">
                &ldquo;Connected by blood, stronger by values.&rdquo;
              </p>
            </div>
          </div>

          {/* Archival Footer */}
          <div className="relative z-10 pt-2 border-t border-[#C6A15B]/30 flex items-center justify-between text-[8px] sm:text-[9px]">
            <div>
              <span className="text-[7px] sm:text-[7.5px] uppercase tracking-[0.18em] text-[#8C7A63] block">
                MEMBER SINCE
              </span>
              <span className="font-semibold text-[#171714] text-xs">
                {memberSinceYear}
              </span>
            </div>

            <div className="text-center">
              <span className="font-serif font-bold text-[9px] sm:text-[10px] text-[#171714] tracking-[0.2em] uppercase block">
                PINJARI FAMILY
              </span>
              <span className="text-[7px] sm:text-[7.5px] tracking-[0.16em] text-[#8C7A63] uppercase block">
                — PRIVATE & TRUSTED —
              </span>
            </div>

            <div className="text-right">
              <p className="font-serif italic text-sm sm:text-base text-[#171714] leading-tight">
                {member.first_name} Pinjari
              </p>
              <span className="text-[6.5px] sm:text-[7px] tracking-[0.2em] text-[#8C7A63] uppercase block">
                FAMILY MEMBER
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Arabesque Jali Band */}
      <ArabesqueJaliBand />
    </>
  );
}

// Reusable Back Face Content
function CardBackContent({
  member,
  fullName,
  father,
  spouse,
  childrenList,
  branchCode,
}: {
  member: FamilyMember;
  fullName: string;
  father: FamilyMember | null;
  spouse: FamilyMember | null;
  childrenList: FamilyMember[];
  branchCode: string;
}) {
  return (
    <>
      {/* Top Forest Green Header Band */}
      <div
        className="relative text-[#D8B46B] px-5 sm:px-6 py-2.5 flex items-center justify-between border-b border-[#C6A15B] overflow-hidden flex-shrink-0"
        style={{
          backgroundColor: "#0E382F",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <rect width="100" height="100" fill="#0E382F" />
        </svg>

        <div className="relative z-10 flex items-center gap-2">
          <HeritageTreeCrest className="w-5 h-5" />
          <span className="text-xs font-serif font-bold tracking-[0.2em] uppercase text-[#D8B46B]">
            PINJARI HERITAGE ARCHIVE • GENEALOGICAL RECORD
          </span>
        </div>
        <span className="relative z-10 text-[10px] font-mono text-[#C6A15B]">
          {branchCode}
        </span>
      </div>

      {/* Magnetic Stripe graphic */}
      <div
        className="h-8 relative border-b border-[#C6A15B]/30 flex items-center px-6 overflow-hidden flex-shrink-0"
        style={{
          backgroundColor: "#171714",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <rect width="100" height="100" fill="#171714" />
        </svg>
        <div className="relative z-10 w-full h-1.5 rounded bg-[#292524]" />
      </div>

      {/* Main Back Content */}
      <div
        className="p-4 sm:p-6 flex-1 flex flex-col justify-between relative space-y-2.5 overflow-hidden"
        style={{
          backgroundColor: "#FAF7F0",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <rect width="100" height="100" fill="#FAF7F0" />
        </svg>

        {/* Authoritative Lineage Trail */}
        <div className="relative z-10">
          <span className="text-[8px] uppercase tracking-[0.2em] text-[#8C7A63] font-bold block mb-1">
            AUTHORITATIVE GENEALOGICAL LINEAGE
          </span>
          <div className="p-2.5 rounded-xl bg-white border border-[#C6A15B]/40 text-xs text-[#171714] shadow-2xs font-medium">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[#8C7A63]">Root:</span>
              <span className="font-serif font-bold text-[#123B32]">Mohammad Pinjari</span>
              {father &&
                father.first_name.toLowerCase() !== "mohammad" &&
                father.id.toLowerCase() !== "mohammad" && (
                  <>
                    <span className="text-[#C6A15B]">➔</span>
                    <span className="font-serif font-bold text-[#123B32]">
                      {father.first_name} Pinjari
                    </span>
                  </>
                )}
              {member.first_name.toLowerCase() !== "mohammad" &&
                member.id.toLowerCase() !== "mohammad" && (
                  <>
                    <span className="text-[#C6A15B]">➔</span>
                    <span className="font-serif font-bold text-[#123B32] bg-[#C6A15B]/20 px-2 py-0.5 rounded border border-[#C6A15B]/30">
                      {fullName}
                    </span>
                  </>
                )}
              {(member.first_name.toLowerCase() === "mohammad" ||
                member.id.toLowerCase() === "mohammad") && (
                <span className="text-[10px] text-[#8C7A63] font-sans italic ml-1">
                  (Patriarch &amp; Founder)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Immediate Family Unit: Real Spouse & Real Children */}
        <div className="relative z-10 grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-[#C6A15B]/40 shadow-2xs">
            <span className="text-[8px] uppercase text-[#8C7A63] font-bold block">
              SPOUSE
            </span>
            <p className="font-serif font-bold text-[#171714] text-sm mt-0.5">
              {spouse ? `${spouse.first_name} Pinjari` : "Unmarried"}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#C6A15B]/40 shadow-2xs">
            <span className="text-[8px] uppercase text-[#8C7A63] font-bold block">
              CHILDREN ({childrenList.length})
            </span>
            <p className="font-serif font-bold text-[#171714] text-sm mt-0.5 truncate">
              {childrenList.length > 0
                ? childrenList.map((c) => c.first_name).join(", ")
                : "None recorded"}
            </p>
          </div>
        </div>

        {/* Archive Security & Legal Notice */}
        <div className="relative z-10 text-[8px] sm:text-[8.5px] text-[#78716C] leading-relaxed border-t border-[#C6A15B]/30 pt-2">
          <p>
            This official identity document is permanently issued by the Pinjari Heritage Archive.
            Scanning the QR code links directly to authorized personal and family documents.
            Unauthorized reproduction or falsification of family records is strictly prohibited.
          </p>
        </div>

        {/* Back Footer */}
        <div className="relative z-10 flex items-center justify-between text-[9px] text-[#8C7A63] font-mono pt-1">
          <span>PINJARI FAMILY ARCHIVE • VERIFIED RECORD</span>
          <span className="text-[#123B32] font-bold">archive.pinjari.family</span>
        </div>
      </div>

      {/* Bottom Arabesque Jali Band */}
      <ArabesqueJaliBand />
    </>
  );
}
