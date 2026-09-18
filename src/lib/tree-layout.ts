import { FamilyMember, Marriage, Relationship } from "@/types";

export interface TreeNode {
  id: string;
  member: FamilyMember;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  spouseId?: string;
  spouseMember?: FamilyMember;
  isDeceased: boolean;
  isLead: boolean;
  hasDocuments?: number;
  hasPhotos?: number;
}

export interface TreeEdge {
  id: string;
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: "marriage" | "parent-child";
  path: string;
}

export interface TreeLayoutResult {
  nodes: TreeNode[];
  edges: TreeEdge[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const SPOUSE_GAP = 28;
const SIBLING_GAP = 56;
const BRANCH_GAP = 80;
const LEVEL_HEIGHT = 200;

interface MemberBranch {
  member: FamilyMember;
  spouse?: FamilyMember;
  childrenBranches: MemberBranch[];
  width: number;
  x: number;
}

export function computeFamilyTreeLayout(
  members: FamilyMember[],
  marriages: Marriage[],
  relationships: Relationship[],
  docCounts: Record<string, number> = {},
  photoCounts: Record<string, number> = {}
): TreeLayoutResult {
  const memberMap = new Map<string, FamilyMember>();
  for (const m of members) {
    memberMap.set(m.id, m);
  }

  // Build spouse map
  const spouseMap = new Map<string, string>();
  for (const m of marriages) {
    spouseMap.set(m.person1_id, m.person2_id);
    spouseMap.set(m.person2_id, m.person1_id);
  }

  // Build parent -> children map
  const childrenMap = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.relationship_type === "child") {
      const existing = childrenMap.get(r.person_id) || [];
      if (!existing.includes(r.related_person_id)) {
        existing.push(r.related_person_id);
        childrenMap.set(r.person_id, existing);
      }
    }
  }

  // Sibling sorting helper: by display_order then id
  const sortMembers = (aId: string, bId: string) => {
    const ma = memberMap.get(aId);
    const mb = memberMap.get(bId);
    if (!ma || !mb) return 0;
    return (ma.display_order || 0) - (mb.display_order || 0);
  };

  // Helper to build branch hierarchy recursively
  const buildBranch = (memberId: string, visited = new Set<string>()): MemberBranch | null => {
    if (visited.has(memberId)) return null;
    visited.add(memberId);

    const member = memberMap.get(memberId);
    if (!member) return null;

    const spouseId = spouseMap.get(memberId);
    let spouse: FamilyMember | undefined = undefined;
    if (spouseId) {
      visited.add(spouseId);
      spouse = memberMap.get(spouseId);
    }

    // Children are from either parent
    const rawChildren1 = childrenMap.get(memberId) || [];
    const rawChildren2 = spouseId ? childrenMap.get(spouseId) || [] : [];
    const uniqueChildIds = Array.from(new Set([...rawChildren1, ...rawChildren2])).sort(sortMembers);

    const childrenBranches: MemberBranch[] = [];
    for (const childId of uniqueChildIds) {
      const childBranch = buildBranch(childId, visited);
      if (childBranch) {
        childrenBranches.push(childBranch);
      }
    }

    // Compute width for this branch
    const coupleWidth = spouse ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH;
    const childrenTotalWidth =
      childrenBranches.length > 0
        ? childrenBranches.reduce((acc, c, idx) => acc + c.width + (idx > 0 ? SIBLING_GAP : 0), 0)
        : 0;

    const branchWidth = Math.max(coupleWidth, childrenTotalWidth);

    return {
      member,
      spouse,
      childrenBranches,
      width: branchWidth,
      x: 0,
    };
  };

  // Root is Mohammad (or members with generation 1 and no parents)
  const rootMember = members.find((m) => m.id === "mohammad") || members.find((m) => m.generation === 1);
  if (!rootMember) {
    return {
      nodes: [],
      edges: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  const rootBranch = buildBranch(rootMember.id);
  if (!rootBranch) {
    return {
      nodes: [],
      edges: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  // Assign x coordinates recursively
  const assignPositions = (branch: MemberBranch, leftX: number) => {
    branch.x = leftX + branch.width / 2;

    let childLeftX = branch.x - (branch.width / 2);
    // Center children if children width is smaller than couple
    const coupleWidth = branch.spouse ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH;
    const childrenTotalWidth =
      branch.childrenBranches.length > 0
        ? branch.childrenBranches.reduce((acc, c, idx) => acc + c.width + (idx > 0 ? SIBLING_GAP : 0), 0)
        : 0;

    if (childrenTotalWidth > 0 && coupleWidth > childrenTotalWidth) {
      childLeftX = branch.x - childrenTotalWidth / 2;
    }

    let currentX = childLeftX;
    for (const child of branch.childrenBranches) {
      assignPositions(child, currentX);
      currentX += child.width + SIBLING_GAP;
    }
  };

  assignPositions(rootBranch, 100);

  const nodes: TreeNode[] = [];
  const edges: TreeEdge[] = [];

  // Generate nodes and edges from positioned branch tree
  const flattenBranch = (branch: MemberBranch) => {
    const gen = branch.member.generation;
    const y = 80 + (gen - 1) * LEVEL_HEIGHT;

    let p1X = branch.x - NODE_WIDTH / 2;
    let spouseX: number | undefined = undefined;

    if (branch.spouse) {
      // Position member and spouse side by side
      p1X = branch.x - (NODE_WIDTH * 2 + SPOUSE_GAP) / 2;
      spouseX = p1X + NODE_WIDTH + SPOUSE_GAP;
    }

    // Add primary node
    nodes.push({
      id: branch.member.id,
      member: branch.member,
      x: p1X,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      generation: gen,
      spouseId: branch.spouse?.id,
      isDeceased: Boolean(branch.member.is_deceased),
      isLead: Boolean(branch.member.is_family_lead),
      hasDocuments: docCounts[branch.member.id] || 0,
      hasPhotos: photoCounts[branch.member.id] || 0,
    });

    // Add spouse node if present
    if (branch.spouse && spouseX !== undefined) {
      nodes.push({
        id: branch.spouse.id,
        member: branch.spouse,
        x: spouseX,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        generation: gen,
        spouseId: branch.member.id,
        isDeceased: Boolean(branch.spouse.is_deceased),
        isLead: Boolean(branch.spouse.is_family_lead),
        hasDocuments: docCounts[branch.spouse.id] || 0,
        hasPhotos: photoCounts[branch.spouse.id] || 0,
      });

      // Marriage connector edge
      const mFromX = p1X + NODE_WIDTH;
      const mFromY = y + NODE_HEIGHT / 2;
      const mToX = spouseX;
      const mToY = y + NODE_HEIGHT / 2;

      edges.push({
        id: `m-edge-${branch.member.id}-${branch.spouse.id}`,
        fromId: branch.member.id,
        toId: branch.spouse.id,
        fromX: mFromX,
        fromY: mFromY,
        toX: mToX,
        toY: mToY,
        type: "marriage",
        path: `M ${mFromX} ${mFromY} L ${mToX} ${mToY}`,
      });
    }

    // Children edges
    if (branch.childrenBranches.length > 0) {
      // Parent center anchor (midpoint between couple or center of single parent)
      const parentAnchorX = branch.spouse ? branch.x : p1X + NODE_WIDTH / 2;
      const parentAnchorY = y + NODE_HEIGHT;
      const busY = parentAnchorY + 44;

      for (const childBranch of branch.childrenBranches) {
        const childGen = childBranch.member.generation;
        const childY = 80 + (childGen - 1) * LEVEL_HEIGHT;
        const childAnchorX = childBranch.spouse
          ? childBranch.x - (NODE_WIDTH * 2 + SPOUSE_GAP) / 2 + NODE_WIDTH / 2
          : childBranch.x;
        const childAnchorY = childY;

        // Orthogonal connecting path with smooth corners
        const path = `M ${parentAnchorX} ${parentAnchorY} L ${parentAnchorX} ${busY} L ${childAnchorX} ${busY} L ${childAnchorX} ${childAnchorY}`;

        edges.push({
          id: `pc-edge-${branch.member.id}-${childBranch.member.id}`,
          fromId: branch.member.id,
          toId: childBranch.member.id,
          fromX: parentAnchorX,
          fromY: parentAnchorY,
          toX: childAnchorX,
          toY: childAnchorY,
          type: "parent-child",
          path,
        });

        flattenBranch(childBranch);
      }
    }
  };

  flattenBranch(rootBranch);

  // Compute total layout bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  }

  // Padding
  minX = Math.max(0, minX - 100);
  minY = Math.max(0, minY - 80);
  maxX += 100;
  maxY += 120;

  return {
    nodes,
    edges,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}
