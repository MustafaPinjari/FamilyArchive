"use client";

import React, { useState } from "react";
import { TreeLayoutResult } from "@/lib/tree-layout";
import { FamilyMember } from "@/types";
import { FamilyTreeCanvas } from "@/components/family-tree/FamilyTreeCanvas";
import { MemberProfileDrawer } from "@/components/members/MemberProfileDrawer";

interface TreePageClientProps {
  layout: TreeLayoutResult;
  members: FamilyMember[];
}

export function TreePageClient({ layout, members }: TreePageClientProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden">
      <FamilyTreeCanvas
        layout={layout}
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={(id) => setSelectedMemberId(id)}
      />

      {/* Member Profile Drawer */}
      <MemberProfileDrawer
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        onSelectMember={(id) => setSelectedMemberId(id)}
        allMembers={members}
      />
    </div>
  );
}
