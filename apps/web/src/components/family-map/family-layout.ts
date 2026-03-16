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
      // childOffset = center of the couple (midpoint of the two spouses) measured
      // from the unit's left edge. Using the couple midpoint (not just the blood
      // descendant's center) ensures the grandparent is visually centered over the
      // evenly-spaced couple units rather than the blood-descendant positions alone.
      const units: Array<{ ids: string[]; w: number; childOffset: number }> = []

      // Single pass in birth order — males and females handled together so the
      // child ordering on screen matches biological birth order left-to-right.
      //
      // MALE blood descendant  → unit: [ghost_wives…, Male, PrimaryWife?]
      //   couple midpoint from unit left = ((2g+1)*(NODE_W+COUPLE_GAP) + NODE_W) / 2
      //   where g = number of ghost wives.
      //
      // FEMALE blood descendant → unit: [Husband, Female]  (husband on the LEFT
      //   per the "woman always to the right of the man" rule; Husband is fetched
      //   from Phase A positions so he moves into place here rather than staying
      //   stranded at a Phase A X coordinate far from his wife).
      //   couple midpoint from unit left = (NODE_W*2 + COUPLE_GAP) / 2  = 132
      //
      // Singles (no spouse) → unit: [Person], childOffset = NODE_W/2 = 60
      for (const cid of children) {
        if (seenInUnit.has(cid)) continue
        seenInUnit.add(cid)

        const childNode    = nodeById.get(cid)
        const primarySpouse = spousePairs.get(cid)
        const primaryNode  = primarySpouse ? nodeById.get(primarySpouse) : undefined

        if (childNode?.gender === 'MALE') {
          // Ghost spouses = female non-primary spouses placed to the LEFT of the male
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
          const g = ghosts.length  // number of ghosts to the left of the male

          const hasWife =
            primarySpouse &&
            primaryNode?.gender === 'FEMALE' &&
            !seenInUnit.has(primarySpouse)
          if (hasWife) {
            seenInUnit.add(primarySpouse!)
            unitIds.push(primarySpouse!)
          }

          const w = (unitIds.length - 1) * (NODE_W + COUPLE_GAP) + NODE_W
          // Couple midpoint: center between [male, wife]; if no wife, just male center
          const childOffset = hasWife
            ? ((2 * g + 1) * (NODE_W + COUPLE_GAP) + NODE_W) / 2
            : g * (NODE_W + COUPLE_GAP) + NODE_W / 2
          units.push({ ids: unitIds, w, childOffset })

        } else if (childNode?.gender === 'FEMALE') {
          // Female blood descendant: husband goes to her LEFT
          const hasHusband =
            primarySpouse &&
            primaryNode?.gender === 'MALE' &&
            !seenInUnit.has(primarySpouse)
          if (hasHusband) {
            seenInUnit.add(primarySpouse!)
            units.push({
              ids:         [primarySpouse!, cid],
              w:           NODE_W * 2 + COUPLE_GAP,
              childOffset: (NODE_W * 2 + COUPLE_GAP) / 2, // couple midpoint = 132
            })
          } else {
            units.push({ ids: [cid], w: NODE_W, childOffset: NODE_W / 2 })
          }

        } else {
          units.push({ ids: [cid], w: NODE_W, childOffset: NODE_W / 2 })
        }
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
      // Center exactly under the parents' junction — no Phase B overlap check.
      // Each family group lands at its natural center; the final overlap
      // resolution pass below handles any resulting collisions while keeping
      // couple units intact.
      let startX = juncCenterX - avgChildCenterOffset

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

      // Recentre the junction X over the repositioned children for the bracket bar
      void maxParentY  // used only for bracketJunctionY below
    }
  }

  // ── Final overlap resolution — couple-unit aware ───────────────────────────
  //
  // Nodes on the same row are grouped into "units" (a person + all their
  // spouses on the same row).  Overlapping units are pushed right as a whole
  // so married couples always stay together at COUPLE_GAP spacing.
  {
    const byY = new Map<number, string[]>()
    for (const [id, pos] of positions) {
      const yKey = Math.round(pos.y)
      if (!byY.has(yKey)) byY.set(yKey, [])
      byY.get(yKey)!.push(id)
    }

    for (const yIds of byY.values()) {
      if (yIds.length <= 1) continue

      // Build units: each person + all of their spouses on this row
      const assigned = new Set<string>()
      const units: string[][] = []

      yIds.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0))

      for (const id of yIds) {
        if (assigned.has(id)) continue
        assigned.add(id)
        const unit: string[] = [id]
        for (const sid of (spouseAllOf.get(id) ?? [])) {
          if (!assigned.has(sid) && yIds.includes(sid)) {
            assigned.add(sid)
            unit.push(sid)
          }
        }
        unit.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0))
        units.push(unit)
      }

      units.sort((a, b) => (positions.get(a[0]!)?.x ?? 0) - (positions.get(b[0]!)?.x ?? 0))

      // Push overlapping units right as a whole
      for (let i = 1; i < units.length; i++) {
        const prev = units[i - 1]!
        const curr = units[i]!
        const prevRight = Math.max(...prev.map((id) => (positions.get(id)?.x ?? 0) + NODE_W))
        const currLeft  = Math.min(...curr.map((id)  =>  positions.get(id)?.x ?? 0))
        if (currLeft < prevRight + UNIT_GAP) {
          const delta = prevRight + UNIT_GAP - currLeft
          for (const id of curr) {
            const pos = positions.get(id)!
            positions.set(id, { ...pos, x: pos.x + delta })
          }
        }
      }
    }
  }

  // ── Phase C — re-centre parents over their actual child positions ──────────
  //
  // Phase B centres children under the parents' Phase-A junction, but the final
  // overlap resolution may shift child groups sideways. Phase C moves each parent
  // couple so their midpoint aligns with the average midpoint of their children's
  // couple units.  We iterate from the DEEPEST generation upward so that moving
  // gen-1 parents doesn't misplace gen-2 children that have already been fixed.
  {
    const genOrder = [...parentGroups.entries()]
      .map(([key, group]) => {
        const maxParentY = Math.max(
          ...group.parentIds.map((pid) => positions.get(pid)?.y ?? 0),
        )
        return { key, group, maxParentY }
      })
      .filter((g) => g.group.childIds.length > 0)
      .sort((a, b) => b.maxParentY - a.maxParentY) // deepest first

    for (const { group } of genOrder) {
      // Compute the midpoint of all children's couple units
      // (couple midpoint = average of left-node center and right-node center within spouseAllOf)
      const childMidpoints = group.childIds.map((cid) => {
        const childPos = positions.get(cid)
        if (!childPos) return null
        // Find the child's spouse on the same row (if any)
        const spouse = (spouseAllOf.get(cid) ?? []).find((sid) => {
          const sp = positions.get(sid)
          return sp && Math.abs(sp.y - childPos.y) < 1
        })
        if (spouse) {
          const spousePos = positions.get(spouse)!
          return ((childPos.x + NODE_W / 2) + (spousePos.x + NODE_W / 2)) / 2
        }
        return childPos.x + NODE_W / 2
      }).filter((v): v is number => v !== null)

      if (childMidpoints.length === 0) continue
      const avgChildMidpoint = childMidpoints.reduce((a, b) => a + b, 0) / childMidpoints.length

      // Current parent couple midpoint
      const parentCenters = group.parentIds.map(
        (pid) => (positions.get(pid)?.x ?? 0) + NODE_W / 2,
      )
      const avgParentCenter = parentCenters.reduce((a, b) => a + b, 0) / parentCenters.length

      const delta = avgChildMidpoint - avgParentCenter
      if (Math.abs(delta) < 0.5) continue

      // Move each parent (and their spouses on the same row) by delta
      const moved = new Set<string>()
      for (const pid of group.parentIds) {
        if (moved.has(pid)) continue
        const pPos = positions.get(pid)
        if (!pPos) continue
        positions.set(pid, { ...pPos, x: pPos.x + delta })
        moved.add(pid)
        // Move spouse too so the couple stays together
        for (const sid of (spouseAllOf.get(pid) ?? [])) {
          if (moved.has(sid)) continue
          const sPos = positions.get(sid)
          if (!sPos || Math.abs(sPos.y - pPos.y) > 1) continue
          positions.set(sid, { ...sPos, x: sPos.x + delta })
          moved.add(sid)
        }
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
      bracketJunctionY: maxParentY + NODE_H + JUNCTION_OFFSET,
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
