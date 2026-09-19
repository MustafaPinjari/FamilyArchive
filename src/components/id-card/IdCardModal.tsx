"use client";

import React from "react";
import { X } from "lucide-react";
import { FamilyMember, Marriage, Relationship } from "@/types";
import { MemberIdCard } from "./MemberIdCard";

interface IdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember | null;
  allMembers?: FamilyMember[];
  marriages?: Marriage[];
  relationships?: Relationship[];
  kinship?: {
    spouse: FamilyMember | null;
    children: FamilyMember[];
    father: FamilyMember | null;
    mother: FamilyMember | null;
  };
}

export function IdCardModal({
  isOpen,
  onClose,
  member,
  allMembers = [],
  marriages = [],
  relationships = [],
  kinship,
}: IdCardModalProps) {
  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-2xl bg-stone-50 rounded-3xl p-4 sm:p-6 shadow-2xl border border-stone-200 print:shadow-none print:border-none print:p-0 print:bg-white">
        <MemberIdCard
          member={member}
          allMembers={allMembers}
          marriages={marriages}
          relationships={relationships}
          kinship={kinship}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
