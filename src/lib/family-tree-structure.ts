import { FamilyMember, Marriage, Relationship } from "@/types";

export interface FamilyHouseholdNode {
  id: string;
  title: string;
  primary: FamilyMember;
  spouse?: FamilyMember | null;
  children: FamilyMember[];
  allMemberIds: string[];
}

export interface FamilyBranchNode {
  id: string;
  title: string;
  lead: FamilyMember;
  spouse?: FamilyMember | null;
  households: FamilyHouseholdNode[];
  allMemberIds: string[];
}

/**
 * Deterministic mapping of the Pinjari family branches and households.
 * Used for building the nested documents hierarchy, ID card lineage trails,
 * and bulk download folder structuring.
 */
export function buildFamilyHierarchy(
  members: FamilyMember[],
  marriages: Marriage[] = [],
  relationships: Relationship[] = []
): FamilyBranchNode[] {
  const memberMap = new Map<string, FamilyMember>();
  for (const m of members) {
    memberMap.set(m.id, m);
  }

  // Helper to find spouse from marriages table or fallback relationships
  const findSpouse = (personId: string): FamilyMember | null => {
    const marriage = marriages.find(
      (m) =>
        (m.person1_id === personId || m.person2_id === personId) &&
        m.status !== "separated"
    );
    if (marriage) {
      const spouseId =
        marriage.person1_id === personId ? marriage.person2_id : marriage.person1_id;
      return memberMap.get(spouseId) || null;
    }
    const rel = relationships.find(
      (r) =>
        (r.person_id === personId || r.related_person_id === personId) &&
        r.relationship_type === "spouse"
    );
    if (rel) {
      const spouseId = rel.person_id === personId ? rel.related_person_id : rel.person_id;
      return memberMap.get(spouseId) || null;
    }
    return null;
  };

  // Helper to find children
  const findChildren = (parentIds: string[]): FamilyMember[] => {
    const childIds = new Set<string>();
    for (const pid of parentIds) {
      const rels = relationships.filter(
        (r) => r.person_id === pid && r.relationship_type === "child"
      );
      for (const r of rels) {
        childIds.add(r.related_person_id);
      }
    }
    return Array.from(childIds)
      .map((id) => memberMap.get(id))
      .filter((m): m is FamilyMember => Boolean(m))
      .sort((a, b) => a.display_order - b.display_order);
  };

  // Gen 2 Branch Heads (Akhtar, Shakur, Sattar, Mukhtar)
  const branchHeads = ["akhtar", "shakur", "sattar", "mukhtar"];
  const branches: FamilyBranchNode[] = [];

  for (const headId of branchHeads) {
    const lead = memberMap.get(headId);
    if (!lead) continue;
    const branchSpouse = findSpouse(headId);
    const parentIds = [headId, branchSpouse?.id].filter(Boolean) as string[];

    // Children of branch head (Generation 3, e.g. Naziya, Mussavir, Arshiya)
    const gen3Children = findChildren(parentIds);
    const households: FamilyHouseholdNode[] = [];
    const branchMemberIds = new Set<string>([headId]);
    if (branchSpouse) branchMemberIds.add(branchSpouse.id);

    // If branch head has direct documents or is standalone household
    for (const child of gen3Children) {
      const childSpouse = findSpouse(child.id);
      const coupleIds = [child.id, childSpouse?.id].filter(Boolean) as string[];
      // Gen 4 Children (e.g. Atiqa, Maira for Naziya & Azhar)
      const grandChildren = findChildren(coupleIds);

      const householdMemberIds = [
        child.id,
        ...(childSpouse ? [childSpouse.id] : []),
        ...grandChildren.map((g) => g.id),
      ];

      householdMemberIds.forEach((id) => branchMemberIds.add(id));

      const title = childSpouse
        ? `${child.first_name} & ${childSpouse.first_name}`
        : child.first_name;

      households.push({
        id: `hh-${child.id}`,
        title,
        primary: child,
        spouse: childSpouse,
        children: grandChildren,
        allMemberIds: householdMemberIds,
      });
    }

    const branchTitle = branchSpouse
      ? `${lead.first_name} & ${branchSpouse.first_name}'s Family`
      : `${lead.first_name}'s Family`;

    branches.push({
      id: `branch-${headId}`,
      title: branchTitle,
      lead,
      spouse: branchSpouse,
      households,
      allMemberIds: Array.from(branchMemberIds),
    });
  }

  return branches;
}

/**
 * Returns all member IDs in the immediate household unit of a person.
 * (Self, Spouse, and Children)
 */
export function getImmediateHouseholdIds(
  personId: string,
  members: FamilyMember[],
  marriages: Marriage[] = [],
  relationships: Relationship[] = []
): string[] {
  const result = new Set<string>([personId]);

  // Find spouse
  for (const m of marriages) {
    if (m.person1_id === personId && m.status !== "separated") result.add(m.person2_id);
    if (m.person2_id === personId && m.status !== "separated") result.add(m.person1_id);
  }

  // Find children
  for (const pid of Array.from(result)) {
    const childRels = relationships.filter(
      (r) => r.person_id === pid && r.relationship_type === "child"
    );
    for (const r of childRels) {
      result.add(r.related_person_id);
    }
  }

  // Also if person is a child without spouse/children, find parents & siblings
  if (result.size === 1) {
    const parentRels = relationships.filter(
      (r) => r.related_person_id === personId && r.relationship_type === "child"
    );
    if (parentRels.length > 0) {
      for (const p of parentRels) {
        result.add(p.person_id);
      }
    }
  }

  return Array.from(result);
}

/**
 * Get a human-readable relation tag between members
 */
export function getRelationTag(
  member: FamilyMember,
  primaryMemberId: string,
  marriages: Marriage[] = [],
  relationships: Relationship[] = []
): string {
  if (member.id === primaryMemberId) return "Self";

  const isSpouse = marriages.some(
    (m) =>
      ((m.person1_id === primaryMemberId && m.person2_id === member.id) ||
        (m.person2_id === primaryMemberId && m.person1_id === member.id)) &&
      m.status !== "separated"
  );
  if (isSpouse) {
    return member.gender === "female" ? "Wife" : "Husband";
  }

  const isChild = relationships.some(
    (r) =>
      r.person_id === primaryMemberId &&
      r.related_person_id === member.id &&
      r.relationship_type === "child"
  );
  if (isChild) {
    return member.gender === "female" ? "Daughter" : "Son";
  }

  const isParent = relationships.some(
    (r) =>
      r.person_id === member.id &&
      r.related_person_id === primaryMemberId &&
      r.relationship_type === "child"
  );
  if (isParent) {
    return member.gender === "female" ? "Mother" : "Father";
  }

  return `Gen ${member.generation}`;
}
