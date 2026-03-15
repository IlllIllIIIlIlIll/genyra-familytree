/**
 * Family tree auto-layout engine.
 *
 * Generation rules (two-pass):
 *   Pass 1 — BFS via parent-child edges only.
 *             Nodes with no parents = generation 0.
 *             Children = parent generation + 1.
 *             Spouses are NOT pulled here — this prevents married-in roots
 *             from prematurely claiming generation 0 and colliding with their
 *             in-law's children.
 *   Pass 2 — Spouse generation resolution (multi-round until stable):
 *             If one spouse has a gen and the other doesn't → copy it.
 *             If both have different gens (cross-generation couple) →
 *             both are placed at the DEEPER (higher number) generation.
 *   Pass 3 — Any node still unassigned (totally disconnected) → gen 0.
 *
 * Bracket lines:
 *   Instead of junction nodes and edges in React Flow, the layout returns
 *   ParentGroupMeta objects that describe each family group's geometry.
 *   The FamilyBracketOverlay component renders the H-bar bracket lines as
 *   a plain SVG overlay, bypassing React Flow's edge-to-node coordinate system.
 *
 *   For each parent group:
 *     - Parent stems: from each parent's bottom center straight down to junctionY.
 *     - Horizontal bar: at junctionY, spanning leftmost to rightmost element.
 *     - Child stems: from junctionY straight down to each child's top center.
 */

import type { MapData } from '@genyra/shared-types'
import { CANVAS } from '../../lib/design-tokens'

const { NODE_W, NODE_H, COUPLE_GAP, UNIT_GAP, GEN_GAP, JUNCTION_OFFSET } = CANVAS

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FlowEdgeMeta {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  relationshipType: string
  edgeType: 'relationshipEdge' | 'bracketEdge'
  // Only set on bracketEdge
  bracketParentIds?: string[]
  bracketChildIds?:  string[]
  bracketJunctionY?: number
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>
  edges: FlowEdgeMeta[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parentGroupKey(ids: string[]): string {
  return [...ids].sort().join('|')
}

// ─── Main function ────────────────────────────────────────────────────────────

export function computeFamilyLayout(mapData: MapData): LayoutResult {
  const { nodes, edges } = mapData
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  // ── Adjacency maps ─────────────────────────────────────────────────────────
  const spousePairs = new Map<string, string>()
  const childrenOf  = new Map<string, Set<string>>()
  const parentsOf   = new Map<string, Set<string>>()

  // spouseAllOf tracks ALL spouses per person (handles sequential remarriage)
  const spouseAllOf = new Map<string, string[]>()

  for (const e of edges) {
    if (e.relationshipType === 'SPOUSE') {
      if (!spouseAllOf.has(e.sourceId)) spouseAllOf.set(e.sourceId, [])
      if (!spouseAllOf.has(e.targetId)) spouseAllOf.set(e.targetId, [])
      spouseAllOf.get(e.sourceId)!.push(e.targetId)
      spouseAllOf.get(e.targetId)!.push(e.sourceId)
    }
    if (e.relationshipType === 'PARENT_CHILD') {
      if (!childrenOf.has(e.sourceId)) childrenOf.set(e.sourceId, new Set())
      childrenOf.get(e.sourceId)!.add(e.targetId)
      if (!parentsOf.has(e.targetId)) parentsOf.set(e.targetId, new Set())
      parentsOf.get(e.targetId)!.add(e.sourceId)
    }
  }

  // Resolve spousePairs: for each person with multiple spouses, prefer the
  // living one; if all are deceased (or all are alive), just pick the last.
  for (const [personId, partnerIds] of spouseAllOf) {
    if (partnerIds.length === 1) {
      spousePairs.set(personId, partnerIds[0]!)
    } else {
      const living = partnerIds.find((id) => !nodeById.get(id)?.isDeceased)
      spousePairs.set(personId, living ?? partnerIds[partnerIds.length - 1]!)
    }
  }

  // ── Generation assignment ──────────────────────────────────────────────────
  const generation = new Map<string, number>()

  // Seed all roots at gen 0
  for (const n of nodes) {
    if ((parentsOf.get(n.id)?.size ?? 0) === 0) {
      generation.set(n.id, 0)
    }
  }

  // Iterative child propagation + spouse resolution until no more changes
  let dirty = true
  let safetyIter = 0
  while (dirty && safetyIter++ < nodes.length * 4) {
    dirty = false

    for (const [parentId, childSet] of childrenOf) {
      const parentGen = generation.get(parentId)
      if (parentGen === undefined) continue
      for (const childId of childSet) {
        const needed  = parentGen + 1
        const current = generation.get(childId)
        if (current === undefined || current < needed) {
          generation.set(childId, needed)
          dirty = true
        }
      }
    }

    for (const e of edges) {
      if (e.relationshipType !== 'SPOUSE') continue
      const gA = generation.get(e.sourceId)
      const gB = generation.get(e.targetId)
      if (gA !== undefined && gB === undefined) {
        generation.set(e.targetId, gA); dirty = true
      } else if (gB !== undefined && gA === undefined) {
        generation.set(e.sourceId, gB); dirty = true
      } else if (gA !== undefined && gB !== undefined && gA !== gB) {
        const resolved = Math.max(gA, gB)
        if (gA !== resolved) { generation.set(e.sourceId, resolved); dirty = true }
        if (gB !== resolved) { generation.set(e.targetId, resolved); dirty = true }
      }
    }
  }

  for (const n of nodes) {
    if (!generation.has(n.id)) generation.set(n.id, 0)
  }

  // ── Group by generation ────────────────────────────────────────────────────
  const byGen = new Map<number, string[]>()
  for (const [id, gen] of generation) {
    if (!byGen.has(gen)) byGen.set(gen, [])
    byGen.get(gen)!.push(id)
  }

  // ── Couple-unit builder ────────────────────────────────────────────────────
  function buildUnits(ids: string[]): string[][] {
    const visited = new Set<string>()
    const units: string[][] = []
    for (const id of ids) {
      if (visited.has(id)) continue
      visited.add(id)
      const partner = spousePairs.get(id)
      if (partner && ids.includes(partner) && !visited.has(partner)) {
        visited.add(partner)
        const node  = nodeById.get(id)
        const pNode = nodeById.get(partner)
        if (node?.gender === 'FEMALE' && pNode?.gender === 'MALE') {
          units.push([partner, id])
        } else {
          units.push([id, partner])
        }
      } else {
        units.push([id])
      }
    }
    return units
  }

  // ── Assign positions ───────────────────────────────────────────────────────
  const positions = new Map<string, { x: number; y: number }>()
  const maxGen    = byGen.size === 0 ? 0 : Math.max(...byGen.keys())

  for (let gen = 0; gen <= maxGen; gen++) {
    const ids   = byGen.get(gen) ?? []
    const units = buildUnits(ids)

    const unitWidths = units.map((u) =>
      u.length === 2 ? NODE_W * 2 + COUPLE_GAP : NODE_W,
    )
    const totalW =
      unitWidths.reduce((a, b) => a + b, 0) +
      UNIT_GAP * Math.max(units.length - 1, 0)

    let curX = -totalW / 2
    const y  = gen * (NODE_H + GEN_GAP)

    for (let ui = 0; ui < units.length; ui++) {
      const unit  = units[ui]!
      const unitW = unitWidths[ui]!
      if (unit.length === 2) {
        positions.set(unit[0]!, { x: curX, y })
        positions.set(unit[1]!, { x: curX + NODE_W + COUPLE_GAP, y })
      } else {
        positions.set(unit[0]!, { x: curX, y })
      }
      curX += unitW + UNIT_GAP
    }
  }

  // ── Build parent groups ────────────────────────────────────────────────────
  const parentGroups = new Map<string, { parentIds: string[]; childIds: string[] }>()

  for (const [childId, pSet] of parentsOf) {
    const key = parentGroupKey([...pSet])
    if (!parentGroups.has(key)) {
      parentGroups.set(key, { parentIds: [...pSet].sort(), childIds: [] })
    }
    parentGroups.get(key)!.childIds.push(childId)
  }

  // ── Reposition children under their parent junction ───────────────────────
  //
  // Gender rule:
  //   Boys  → processed first; they anchor the left-to-right order.
  //            Each boy brings his wife immediately to his right (if she exists).
  //   Girls → only repositioned when married (placed next to their husband above).
  //            Unmarried girls are appended after all male units in natural order.
  //
  // Centering: always uses the unified total-width formula (no odd/even branch).
  // childY:    derived from the child's generation, not Math.max of positions
  //            (avoids picking the wrong row when children span multiple gens).
  {
    const sortedGroups = [...parentGroups.entries()]
      .map(([key, group]) => {
        const maxParentY = Math.max(
          ...group.parentIds.map((pid) => positions.get(pid)?.y ?? 0),
        )
        return { key, group, maxParentY }
      })
      .filter((g) => g.group.childIds.length > 0)
      .sort((a, b) => {
        // Primary: generation order (maxParentY ASC) so that parents are always
        // repositioned before any of their children's groups are processed.
        // Secondary: left-to-right by parent X so sibling groups don't overlap.
        if (a.maxParentY !== b.maxParentY) return a.maxParentY - b.maxParentY
        const avgX = (g: typeof a) =>
          g.group.parentIds.reduce((s, id) => s + (positions.get(id)?.x ?? 0) + NODE_W / 2, 0) /
          g.group.parentIds.length
        return avgX(a) - avgX(b)
      })

    const rightEdgeByY  = new Map<number, number>()
    const alreadyPlaced = new Set<string>()

    for (const { group, maxParentY } of sortedGroups) {
      const children = [...group.childIds]
        .filter((id) => !alreadyPlaced.has(id))
        .sort((a, b) => {
          // Oldest child first (ascending birth date); unknown dates go last
          const aDate = nodeById.get(a)?.birthDate
            ? new Date(nodeById.get(a)!.birthDate as string).getTime() : Infinity
          const bDate = nodeById.get(b)?.birthDate
            ? new Date(nodeById.get(b)!.birthDate as string).getTime() : Infinity
          return aDate - bDate
        })
      if (children.length === 0) continue

      // Use generation-based Y (all siblings share the same generation)
      const firstChildGen = generation.get(children[0]!) ?? 0
      const childY = firstChildGen * (NODE_H + GEN_GAP)

      const seenInUnit = new Set<string>()
      // childOffset = center of the CHILD node (ids[0] for males, ids[0] for females)
      // measured from the unit's left edge. Used for avgChildCenterOffset centering.
      const units: Array<{ ids: string[]; w: number; childOffset: number }> = []

      // Pass 1 — males anchor order.
      //   Each male pulls his ghost spouses (deceased/secondary wives) to HIS LEFT,
      //   then himself, then his primary wife to HIS RIGHT.
      //   Layout: [ghost…, Male, PrimaryWife?]
      for (const cid of children) {
        const childNode = nodeById.get(cid)
        if (childNode?.gender !== 'MALE') continue
        if (seenInUnit.has(cid)) continue
        seenInUnit.add(cid)

        const primarySpouse = spousePairs.get(cid)

        // Ghost spouses = all female spouses that are NOT the primary one
        const ghosts = (spouseAllOf.get(cid) ?? [])
          .filter((sid) =>
            sid !== primarySpouse &&
            nodeById.get(sid)?.gender === 'FEMALE' &&
            !seenInUnit.has(sid),
          )
          .sort((a, b) => {
            // Most recently born ghost closest to the male (inner left)
            const aT = nodeById.get(a)?.birthDate
              ? new Date(nodeById.get(a)!.birthDate as string).getTime() : 0
            const bT = nodeById.get(b)?.birthDate
              ? new Date(nodeById.get(b)!.birthDate as string).getTime() : 0
            return bT - aT
          })
        ghosts.forEach((sid) => seenInUnit.add(sid))

        const unitIds: string[] = [...ghosts, cid]
        // Child (male) center from unit left = ghosts * (NODE_W + COUPLE_GAP) + NODE_W/2
        const childOffset = ghosts.length * (NODE_W + COUPLE_GAP) + NODE_W / 2

        const primaryNode = primarySpouse ? nodeById.get(primarySpouse) : undefined
        if (primarySpouse && primaryNode?.gender === 'FEMALE' && !seenInUnit.has(primarySpouse)) {
          seenInUnit.add(primarySpouse)
          unitIds.push(primarySpouse)
        }

        const w = (unitIds.length - 1) * (NODE_W + COUPLE_GAP) + NODE_W
        units.push({ ids: unitIds, w, childOffset })
      }

      // Pass 2 — remaining children (females, unknown gender) appended in age order
      for (const cid of children) {
        if (seenInUnit.has(cid)) continue
        seenInUnit.add(cid)
        units.push({ ids: [cid], w: NODE_W, childOffset: NODE_W / 2 })
      }

      // Junction center X = average of parent card centers
      const juncCenterX =
        group.parentIds.reduce((s, pid) => s + (positions.get(pid)?.x ?? 0) + NODE_W / 2, 0) /
        group.parentIds.length

      // Center the children (the male anchor of each unit) around juncCenterX.
      // childOffset gives each unit's male center distance from the unit's left edge.
      let childCenterOffsetSum = 0
      let unitRunOffset = 0
      for (const u of units) {
        childCenterOffsetSum += unitRunOffset + u.childOffset
        unitRunOffset += u.w + UNIT_GAP
      }
      const avgChildCenterOffset = childCenterOffsetSum / units.length
      let   startX = juncCenterX - avgChildCenterOffset

      // Prevent overlap with groups already placed on this row
      const prevRight = rightEdgeByY.get(childY) ?? -Infinity
      if (startX < prevRight + UNIT_GAP) startX = prevRight + UNIT_GAP

      for (const unit of units) {
        for (let k = 0; k < unit.ids.length; k++) {
          positions.set(unit.ids[k]!, {
            x: startX + k * (NODE_W + COUPLE_GAP),
            y: childY,
          })
          alreadyPlaced.add(unit.ids[k]!)
        }
        startX += unit.w + UNIT_GAP
      }

      rightEdgeByY.set(childY, startX - UNIT_GAP)

      // Recentre the junction X over the repositioned children for the bracket bar
      void maxParentY  // used only for bracketJunctionY below
    }
  }

  // ── Final overlap resolution ───────────────────────────────────────────────
  {
    const byY = new Map<number, string[]>()
    for (const [id, pos] of positions) {
      const yKey = Math.round(pos.y)
      if (!byY.has(yKey)) byY.set(yKey, [])
      byY.get(yKey)!.push(id)
    }
    for (const ids of byY.values()) {
      if (ids.length <= 1) continue
      ids.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0))
      for (let i = 1; i < ids.length; i++) {
        const prev = positions.get(ids[i - 1]!)!
        const curr = positions.get(ids[i]!)!
        const isCouple = spousePairs.get(ids[i - 1]!) === ids[i]
        const minGap   = isCouple ? COUPLE_GAP : Math.max(UNIT_GAP / 2, 20)
        const minX     = prev.x + NODE_W + minGap
        if (curr.x < minX) positions.set(ids[i]!, { ...curr, x: minX })
      }
    }
  }

  // ── Build edges ────────────────────────────────────────────────────────────
  // bracketEdges FIRST so they render behind; relationshipEdges LAST so they
  // render on top (and their white-bridge path covers bracket lines they cross).
  const flowEdges: FlowEdgeMeta[] = []

  // PARENT_CHILD — one bracketEdge per parent group, rendered by BracketEdgeComponent.
  // source/target are just valid node IDs so React Flow renders the edge;
  // the component ignores handle positions and reads useNodes() directly.
  for (const [key, group] of parentGroups) {
    if (group.childIds.length === 0) continue
    const maxParentY = Math.max(
      ...group.parentIds.map((pid) => positions.get(pid)?.y ?? 0),
    )
    flowEdges.push({
      id:               `bracket_${key}`,
      source:           group.parentIds[0]!,
      target:           group.childIds[0]!,
      sourceHandle:     'bottom',
      targetHandle:     'top',
      relationshipType: 'PARENT_CHILD',
      edgeType:         'bracketEdge',
      bracketParentIds: group.parentIds,
      bracketChildIds:  group.childIds,
      bracketJunctionY: maxParentY + NODE_H + JUNCTION_OFFSET +
        (group.childIds.length > 1 ? 30 : 0),
    })
  }

  // SPOUSE / SIBLING — relationship edges (render on top with white bridge)
  for (const e of edges) {
    if (e.relationshipType === 'PARENT_CHILD') continue
    const srcPos    = positions.get(e.sourceId)
    const tgtPos    = positions.get(e.targetId)
    const srcIsLeft = (srcPos?.x ?? 0) < (tgtPos?.x ?? 0)
    flowEdges.push({
      id:               e.id,
      source:           e.sourceId,
      target:           e.targetId,
      sourceHandle:     srcIsLeft ? 'right' : 'left',
      targetHandle:     srcIsLeft ? 'left'  : 'right',
      relationshipType: e.relationshipType,
      edgeType:         'relationshipEdge',
    })
  }

  return { positions, edges: flowEdges }
}
