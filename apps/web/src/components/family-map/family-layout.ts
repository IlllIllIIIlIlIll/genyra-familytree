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
 * Layout flow (five phases):
 *   Phase A — Initial top-down placement in couple units per generation row.
 *             All spouses of a person (ghost + primary) are grouped into ONE
 *             unit so no spouse ends up as a stranded singleton.
 *
 *   Phase B — Re-position children under their parent junction.
 *             Single birth-order pass; male blood descendants bring their wife,
 *             female blood descendants bring their husband (plus any ghost
 *             husbands from prior marriages).
 *             Gap between consecutive childless-sibling units = COUPLE_GAP;
 *             gap adjacent to a unit with descendants = UNIT_GAP.
 *             Multi-marriage families: children of successive marriages are
 *             placed starting from the right edge of the prior marriage's
 *             children (rightEdgeByParent).
 *             Called TWICE: once after Phase A and once after Phase C.
 *
 *   Phase C — Bottom-up: re-centre parents over their actual child positions.
 *             Uses a global `movedInPhaseC` set so shared parents (remarried)
 *             are only moved once.
 *
 *   Overlap  — Three passes of BFS unit-aware horizontal overlap resolution:
 *             after Phase B (1st run), after Phase C, and after Phase B (2nd run).
 *             BFS transitive traversal keeps all connected spouses (e.g. [Ono,
 *             Yono, Emin]) in one inseparable unit so no spouse is left behind.
 *
 *   Normalise — Final pass enforces COUPLE_GAP within each spouse unit
 *             (only fixes squeezed couples; legitimately stretched ones are left).
 *             Followed by a fourth overlap pass to propagate any resulting pushes.
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
  bracketParentIds?: string[]
  bracketChildIds?:  string[]
  bracketJunctionY?: number
  /**
   * For parents who appear in more than one bracket (remarried), each bracket
   * records a small x-offset for that parent's stem so the two lines visually
   * exit from slightly different points on the card bottom.
   * Key = parentId, value = px offset (negative = left, positive = right).
   */
  bracketParentStemOffsets?: Record<string, number>
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
  const spousePairs = new Map<string, string>()   // preferred (living) spouse
  const childrenOf  = new Map<string, Set<string>>()
  const parentsOf   = new Map<string, Set<string>>()
  const spouseAllOf = new Map<string, string[]>()  // ALL spouses per person

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

  // Resolve spousePairs: prefer the living spouse; if all deceased pick last.
  for (const [personId, partnerIds] of spouseAllOf) {
    if (partnerIds.length === 1) {
      spousePairs.set(personId, partnerIds[0]!)
    } else {
      const living = partnerIds.find((id) => !nodeById.get(id)?.isDeceased)
      spousePairs.set(personId, living ?? partnerIds[partnerIds.length - 1]!)
    }
  }

  // hasDescendants: nodes that are a direct parent of at least one child.
  // Used to decide gap size: childless singletons pack with COUPLE_GAP,
  // units that have children need UNIT_GAP breathing room for their subtree.
  const hasDescendants = new Set<string>(childrenOf.keys())

  // ── Generation assignment ──────────────────────────────────────────────────
  const generation = new Map<string, number>()

  for (const n of nodes) {
    if ((parentsOf.get(n.id)?.size ?? 0) === 0) generation.set(n.id, 0)
  }

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

  // ── Phase A: couple-unit builder ───────────────────────────────────────────
  // BFS collects every transitively-connected spouse on the row into one group,
  // then identifies the "pivot" — the person with the most spouses (the one who
  // remarried). The pivot is placed in the MIDDLE of the unit:
  //   MALE pivot   → [ghost_wives…, male, primaryWife?]
  //   FEMALE pivot → [ghost_husbands…, female, primaryHusband?]
  // Using BFS (not one-hop lookup) prevents a non-pivot spouse from being
  // processed first and accidentally consuming the pivot as her own husband,
  // which would leave the pivot's other spouses as stranded singletons.
  function buildUnits(ids: string[]): string[][] {
    const visited = new Set<string>()
    const idSet   = new Set(ids)
    const units: string[][] = []

    for (const id of ids) {
      if (visited.has(id)) continue

      // BFS: gather the full connected spouse cluster on this row
      const group: string[] = []
      const queue = [id]
      while (queue.length > 0) {
        const cur = queue.shift()!
        if (visited.has(cur)) continue
        visited.add(cur)
        group.push(cur)
        for (const sid of (spouseAllOf.get(cur) ?? [])) {
          if (!visited.has(sid) && idSet.has(sid)) queue.push(sid)
        }
      }

      if (group.length === 1) {
        units.push(group)
        continue
      }

      // Pivot = person with the most in-group spouses (remarried person).
      // Tiebreak: prefer whoever has children (blood descendant of this row).
      let pivot = group[0]!
      let pivotSpouseCount = 0
      for (const cand of group) {
        const cnt = (spouseAllOf.get(cand) ?? []).filter((s) => idSet.has(s)).length
        const beats =
          cnt > pivotSpouseCount ||
          (cnt === pivotSpouseCount &&
            hasDescendants.has(cand) &&
            !hasDescendants.has(pivot))
        if (beats) { pivot = cand; pivotSpouseCount = cnt }
      }

      const pivotNode    = nodeById.get(pivot)
      const pivotPrimary = spousePairs.get(pivot)
      const others       = group.filter((s) => s !== pivot)

      if (pivotNode?.gender === 'MALE') {
        // Ghost wives on the LEFT, pivot male in centre, primary wife on RIGHT
        const ghosts = others.filter(
          (s) => s !== pivotPrimary && nodeById.get(s)?.gender === 'FEMALE',
        )
        const hasPrimaryWife =
          !!pivotPrimary &&
          others.includes(pivotPrimary) &&
          nodeById.get(pivotPrimary)?.gender === 'FEMALE'
        const unit = [...ghosts, pivot, ...(hasPrimaryWife ? [pivotPrimary!] : [])]
        others.filter((s) => !unit.includes(s)).forEach((s) => unit.push(s))
        units.push(unit)
      } else if (pivotNode?.gender === 'FEMALE') {
        // Ghost husbands on the LEFT, pivot female in centre, primary husband on RIGHT
        const ghosts = others.filter(
          (s) => s !== pivotPrimary && nodeById.get(s)?.gender === 'MALE',
        )
        const hasPrimaryHusband =
          !!pivotPrimary &&
          others.includes(pivotPrimary) &&
          nodeById.get(pivotPrimary)?.gender === 'MALE'
        const unit = [...ghosts, pivot, ...(hasPrimaryHusband ? [pivotPrimary!] : [])]
        others.filter((s) => !unit.includes(s)).forEach((s) => unit.push(s))
        units.push(unit)
      } else {
        units.push([pivot, ...others])
      }
    }
    return units
  }

  // ── Phase A: assign initial positions ─────────────────────────────────────
  const positions = new Map<string, { x: number; y: number }>()
  const maxGen    = byGen.size === 0 ? 0 : Math.max(...byGen.keys())

  for (let gen = 0; gen <= maxGen; gen++) {
    const ids   = byGen.get(gen) ?? []
    const units = buildUnits(ids)

    const unitWidths = units.map((u) =>
      u.length === 1 ? NODE_W : (u.length - 1) * (NODE_W + COUPLE_GAP) + NODE_W,
    )
    const totalW =
      unitWidths.reduce((a, b) => a + b, 0) +
      UNIT_GAP * Math.max(units.length - 1, 0)

    let curX = -totalW / 2
    const y  = gen * (NODE_H + GEN_GAP)

    for (let ui = 0; ui < units.length; ui++) {
      const unit  = units[ui]!
      const unitW = unitWidths[ui]!
      for (let k = 0; k < unit.length; k++) {
        positions.set(unit[k]!, { x: curX + k * (NODE_W + COUPLE_GAP), y })
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

  // ── Helper: gap between two consecutive units ──────────────────────────────
  // Childless siblings pack tightly (COUPLE_GAP).
  // At least one unit with descendants → UNIT_GAP for subtree breathing room.
  function unitGap(aIds: string[], bIds: string[]): number {
    return aIds.some((id) => hasDescendants.has(id)) ||
      bIds.some((id) => hasDescendants.has(id))
      ? UNIT_GAP
      : COUPLE_GAP
  }

  // ── Phase B: reposition children under their parent junction ──────────────
  // Extracted as a callable function so it can be run twice:
  //   1st run — after Phase A initial placement
  //   2nd run — after Phase C (re-centres children under updated parent positions)
  function runPhaseB(): void {
    const sortedGroups = [...parentGroups.entries()]
      .map(([key, group]) => {
        const maxParentY = Math.max(
          ...group.parentIds.map((pid) => positions.get(pid)?.y ?? 0),
        )
        return { key, group, maxParentY }
      })
      .filter((g) => g.group.childIds.length > 0)
      .sort((a, b) => {
        if (a.maxParentY !== b.maxParentY) return a.maxParentY - b.maxParentY
        const avgX = (g: typeof a) =>
          g.group.parentIds.reduce(
            (s, id) => s + (positions.get(id)?.x ?? 0) + NODE_W / 2,
            0,
          ) / g.group.parentIds.length
        return avgX(a) - avgX(b)
      })

    // Fresh state each run — ensures children follow updated parent positions
    const alreadyPlaced    = new Set<string>()
    const rightEdgeByParent = new Map<string, number>()

    for (const { group, maxParentY } of sortedGroups) {
      const children = [...group.childIds]
        .filter((id) => !alreadyPlaced.has(id))
        .sort((a, b) => {
          const aT = nodeById.get(a)?.birthDate
            ? new Date(nodeById.get(a)!.birthDate as string).getTime() : Infinity
          const bT = nodeById.get(b)?.birthDate
            ? new Date(nodeById.get(b)!.birthDate as string).getTime() : Infinity
          return aT - bT
        })
      if (children.length === 0) continue

      const firstChildGen = generation.get(children[0]!) ?? 0
      const childY = firstChildGen * (NODE_H + GEN_GAP)

      const seenInUnit = new Set<string>()
      const units: Array<{ ids: string[]; w: number; childOffset: number }> = []

      for (const cid of children) {
        if (seenInUnit.has(cid)) continue
        seenInUnit.add(cid)

        const childNode     = nodeById.get(cid)
        const primarySpouse = spousePairs.get(cid)
        const primaryNode   = primarySpouse ? nodeById.get(primarySpouse) : undefined

        if (childNode?.gender === 'MALE') {
          const ghosts = (spouseAllOf.get(cid) ?? [])
            .filter(
              (sid) =>
                sid !== primarySpouse &&
                nodeById.get(sid)?.gender === 'FEMALE' &&
                !seenInUnit.has(sid),
            )
            .sort((a, b) => {
              const aT = nodeById.get(a)?.birthDate
                ? new Date(nodeById.get(a)!.birthDate as string).getTime() : 0
              const bT = nodeById.get(b)?.birthDate
                ? new Date(nodeById.get(b)!.birthDate as string).getTime() : 0
              return bT - aT
            })
          ghosts.forEach((sid) => seenInUnit.add(sid))
          const g = ghosts.length
          const hasWife =
            primarySpouse &&
            primaryNode?.gender === 'FEMALE' &&
            !seenInUnit.has(primarySpouse)
          if (hasWife) seenInUnit.add(primarySpouse!)
          const unitIds: string[] = [...ghosts, cid, ...(hasWife ? [primarySpouse!] : [])]
          const w = (unitIds.length - 1) * (NODE_W + COUPLE_GAP) + NODE_W
          // childOffset = couple midpoint: centre between male and primaryWife
          const childOffset = hasWife
            ? ((2 * g + 1) * (NODE_W + COUPLE_GAP) + NODE_W) / 2
            : g * (NODE_W + COUPLE_GAP) + NODE_W / 2
          units.push({ ids: unitIds, w, childOffset })

        } else if (childNode?.gender === 'FEMALE') {
          // Ghost husbands = non-primary MALE spouses (prior marriages)
          const ghosts = (spouseAllOf.get(cid) ?? [])
            .filter(
              (sid) =>
                sid !== primarySpouse &&
                nodeById.get(sid)?.gender === 'MALE' &&
                !seenInUnit.has(sid),
            )
          ghosts.forEach((sid) => seenInUnit.add(sid))
          const g = ghosts.length
          const hasHusband =
            primarySpouse &&
            primaryNode?.gender === 'MALE' &&
            !seenInUnit.has(primarySpouse)
          if (hasHusband) seenInUnit.add(primarySpouse!)

          if (hasHusband) {
            const unitIds = [...ghosts, primarySpouse!, cid]
            const w = (unitIds.length - 1) * (NODE_W + COUPLE_GAP) + NODE_W
            // childOffset = couple midpoint of [primaryHusband, female]
            const childOffset = ((2 * g + 1) * (NODE_W + COUPLE_GAP) + NODE_W) / 2
            units.push({ ids: unitIds, w, childOffset })
          } else if (g > 0) {
            const unitIds = [...ghosts, cid]
            const w = (unitIds.length - 1) * (NODE_W + COUPLE_GAP) + NODE_W
            units.push({ ids: unitIds, w, childOffset: g * (NODE_W + COUPLE_GAP) + NODE_W / 2 })
          } else {
            units.push({ ids: [cid], w: NODE_W, childOffset: NODE_W / 2 })
          }

        } else {
          units.push({ ids: [cid], w: NODE_W, childOffset: NODE_W / 2 })
        }
      }

      if (units.length === 0) continue

      // Precompute variable gaps between consecutive units
      const gaps: number[] = units.slice(0, -1).map((u, i) =>
        unitGap(u.ids, units[i + 1]!.ids),
      )

      // Average child-centre offset (used for centring the group under junction)
      let childCenterOffsetSum = 0
      let runOffset = 0
      for (let ui = 0; ui < units.length; ui++) {
        childCenterOffsetSum += runOffset + units[ui]!.childOffset
        if (ui < units.length - 1) runOffset += units[ui]!.w + gaps[ui]!
      }
      const avgChildCenterOffset = childCenterOffsetSum / units.length

      // Junction centre = average of parent card centres
      const juncCenterX =
        group.parentIds.reduce(
          (s, pid) => s + (positions.get(pid)?.x ?? 0) + NODE_W / 2,
          0,
        ) / group.parentIds.length

      // Multi-marriage coordination: if a shared parent already has children
      // placed, start this group's children to the right of them.
      const sharedRightEdge = Math.max(
        ...group.parentIds
          .map((pid) => rightEdgeByParent.get(pid) ?? -Infinity)
          .filter((x) => isFinite(x)),
        -Infinity,
      )

      let startX = juncCenterX - avgChildCenterOffset
      if (isFinite(sharedRightEdge) && sharedRightEdge + UNIT_GAP > startX) {
        startX = sharedRightEdge + UNIT_GAP
      }

      // Place units
      for (let ui = 0; ui < units.length; ui++) {
        const unit = units[ui]!
        for (let k = 0; k < unit.ids.length; k++) {
          positions.set(unit.ids[k]!, {
            x: startX + k * (NODE_W + COUPLE_GAP),
            y: childY,
          })
          alreadyPlaced.add(unit.ids[k]!)
        }
        startX += unit.w + (gaps[ui] ?? 0)
      }

      // Record right edge of this placement for each parent (multi-marriage tracking).
      // After the loop, startX is positioned at right edge of last unit (last gap = 0).
      for (const pid of group.parentIds) {
        rightEdgeByParent.set(pid, Math.max(rightEdgeByParent.get(pid) ?? -Infinity, startX))
      }

      void maxParentY // used for bracketJunctionY in edge builder below
    }
  }

  // ── Overlap resolution — BFS unit-aware ───────────────────────────────────
  // BFS traversal ensures all transitively-connected spouses on a row form ONE
  // unit (e.g. [Ono, Yono, Emin]), so pushing the unit never splits a couple.
  function resolveOverlaps(): void {
    const byY = new Map<number, string[]>()
    for (const [id, pos] of positions) {
      const yKey = Math.round(pos.y)
      if (!byY.has(yKey)) byY.set(yKey, [])
      byY.get(yKey)!.push(id)
    }

    for (const yIds of byY.values()) {
      if (yIds.length <= 1) continue

      yIds.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0))

      // BFS: collect all transitively-connected spouses as one inseparable unit
      const assigned = new Set<string>()
      const rowUnits: string[][] = []

      for (const id of yIds) {
        if (assigned.has(id)) continue
        const unit: string[] = []
        const queue = [id]
        while (queue.length > 0) {
          const cur = queue.shift()!
          if (assigned.has(cur)) continue
          assigned.add(cur)
          unit.push(cur)
          for (const sid of (spouseAllOf.get(cur) ?? [])) {
            if (!assigned.has(sid) && yIds.includes(sid)) queue.push(sid)
          }
        }
        unit.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0))
        rowUnits.push(unit)
      }

      rowUnits.sort((a, b) => (positions.get(a[0]!)?.x ?? 0) - (positions.get(b[0]!)?.x ?? 0))

      for (let i = 1; i < rowUnits.length; i++) {
        const prev = rowUnits[i - 1]!
        const curr = rowUnits[i]!
        const prevRight = Math.max(...prev.map((id) => (positions.get(id)?.x ?? 0) + NODE_W))
        const currLeft  = Math.min(...curr.map((id) =>  positions.get(id)?.x ?? 0))
        const gap = unitGap(prev, curr)
        if (currLeft < prevRight + gap) {
          const delta = prevRight + gap - currLeft
          for (const id of curr) {
            const pos = positions.get(id)!
            positions.set(id, { ...pos, x: pos.x + delta })
          }
        }
      }
    }
  }

  // ── Couple-gap normaliser ──────────────────────────────────────────────────
  // After all overlap passes, within each BFS spouse unit enforce that no two
  // consecutive members are closer than COUPLE_GAP. Only fixes squeezed couples
  // (< COUPLE_GAP); legitimately-stretched couples are left as-is.
  function normalizeCoupleGaps(): void {
    const byY = new Map<number, string[]>()
    for (const [id, pos] of positions) {
      const yKey = Math.round(pos.y)
      if (!byY.has(yKey)) byY.set(yKey, [])
      byY.get(yKey)!.push(id)
    }

    for (const yIds of byY.values()) {
      if (yIds.length <= 1) continue
      yIds.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0))

      const assigned = new Set<string>()
      const rowUnits: string[][] = []

      for (const id of yIds) {
        if (assigned.has(id)) continue
        const unit: string[] = []
        const queue = [id]
        while (queue.length > 0) {
          const cur = queue.shift()!
          if (assigned.has(cur)) continue
          assigned.add(cur)
          unit.push(cur)
          for (const sid of (spouseAllOf.get(cur) ?? [])) {
            if (!assigned.has(sid) && yIds.includes(sid)) queue.push(sid)
          }
        }
        unit.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0))
        rowUnits.push(unit)
      }

      for (const unit of rowUnits) {
        if (unit.length <= 1) continue
        // Enforce COUPLE_GAP between consecutive members within the unit
        for (let i = 1; i < unit.length; i++) {
          const leftPos  = positions.get(unit[i - 1]!)!
          const rightPos = positions.get(unit[i]!)!
          const actualGap = rightPos.x - leftPos.x - NODE_W
          if (actualGap < COUPLE_GAP) {
            const delta = COUPLE_GAP - actualGap
            // Shift all nodes from index i to end of unit rightward
            for (let j = i; j < unit.length; j++) {
              const p = positions.get(unit[j]!)!
              positions.set(unit[j]!, { ...p, x: p.x + delta })
            }
          }
        }
      }
    }
  }

  // ── Layout execution ───────────────────────────────────────────────────────
  // 1. Phase B (1st run): position children under parents
  runPhaseB()
  // 2. Overlap pass 1: settle initial placement
  resolveOverlaps()

  // ── Phase C — re-centre parents over their actual child positions ──────────
  // Iterates deepest parent groups first (bottom-up).
  // A shared parent (remarried) is only moved ONCE via movedInPhaseC.
  {
    const movedInPhaseC = new Set<string>()

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
      const childMidpoints = group.childIds
        .map((cid) => {
          const childPos = positions.get(cid)
          if (!childPos) return null
          const spouse = (spouseAllOf.get(cid) ?? []).find((sid) => {
            const sp = positions.get(sid)
            return sp && Math.abs(sp.y - childPos.y) < 1
          })
          if (spouse) {
            const spousePos = positions.get(spouse)!
            return ((childPos.x + NODE_W / 2) + (spousePos.x + NODE_W / 2)) / 2
          }
          return childPos.x + NODE_W / 2
        })
        .filter((v): v is number => v !== null)

      if (childMidpoints.length === 0) continue
      const avgChildMidpoint =
        childMidpoints.reduce((a, b) => a + b, 0) / childMidpoints.length

      // Only move parents that haven't been moved yet by another group
      const parentsToMove = group.parentIds.filter((pid) => !movedInPhaseC.has(pid))
      if (parentsToMove.length === 0) continue

      const parentCenters = parentsToMove.map(
        (pid) => (positions.get(pid)?.x ?? 0) + NODE_W / 2,
      )
      const avgParentCenter =
        parentCenters.reduce((a, b) => a + b, 0) / parentCenters.length

      const delta = avgChildMidpoint - avgParentCenter
      if (Math.abs(delta) < 0.5) {
        parentsToMove.forEach((pid) => movedInPhaseC.add(pid))
        continue
      }

      // Move each parent + their same-row spouses.
      // Guard against double-move: a spouse may already be marked (moved as
      // another parent's spouse in a prior iteration of this loop).
      for (const pid of parentsToMove) {
        if (movedInPhaseC.has(pid)) continue  // already moved as another's spouse
        movedInPhaseC.add(pid)
        const pPos = positions.get(pid)
        if (!pPos) continue
        positions.set(pid, { ...pPos, x: pPos.x + delta })
        for (const sid of (spouseAllOf.get(pid) ?? [])) {
          if (movedInPhaseC.has(sid)) continue
          const sPos = positions.get(sid)
          if (!sPos || Math.abs(sPos.y - pPos.y) > 1) continue
          positions.set(sid, { ...sPos, x: sPos.x + delta })
          movedInPhaseC.add(sid)
        }
      }
    }
  }

  // 3. Overlap pass 2: fix collisions introduced by Phase C
  resolveOverlaps()
  // 4. Phase B (2nd run): re-centre children under updated parent positions
  runPhaseB()
  // 5. Overlap pass 3: fix collisions from 2nd Phase B
  resolveOverlaps()
  // 6. Normalise couple gaps (fix any squeezed couples)
  normalizeCoupleGaps()
  // 7. Overlap pass 4: propagate any pushes from normalisation
  resolveOverlaps()

  // ── Build edges ────────────────────────────────────────────────────────────
  const flowEdges: FlowEdgeMeta[] = []

  // Multi-marriage stem offsets: parents that appear in > 1 bracket get a small
  // x-offset on their stem so each marriage's child line exits from a distinct
  // point on the card bottom (small gap between them, toward the junction side).
  const MARRIAGE_STEM_OFFSET = 6  // px each side
  const parentBracketCount = new Map<string, number>()
  for (const [, group] of parentGroups) {
    if (group.childIds.length === 0) continue
    for (const pid of group.parentIds) {
      parentBracketCount.set(pid, (parentBracketCount.get(pid) ?? 0) + 1)
    }
  }

  for (const [key, group] of parentGroups) {
    if (group.childIds.length === 0) continue
    const maxParentY = Math.max(
      ...group.parentIds.map((pid) => positions.get(pid)?.y ?? 0),
    )

    // Junction centre X = average of parent card centres (used to decide offset direction)
    const junctionCenterX =
      group.parentIds.reduce((s, pid) => s + (positions.get(pid)?.x ?? 0) + NODE_W / 2, 0) /
      group.parentIds.length

    // For multi-marriage parents, offset toward the junction so the two stems
    // from the same card are visually distinct.
    const stemOffsets: Record<string, number> = {}
    for (const pid of group.parentIds) {
      if ((parentBracketCount.get(pid) ?? 0) > 1) {
        const pCenterX = (positions.get(pid)?.x ?? 0) + NODE_W / 2
        stemOffsets[pid] =
          junctionCenterX < pCenterX ? -MARRIAGE_STEM_OFFSET : MARRIAGE_STEM_OFFSET
      }
    }

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
      ...(Object.keys(stemOffsets).length > 0 && { bracketParentStemOffsets: stemOffsets }),
    })
  }

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
