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
 * Junction nodes:
 *   - For every set of children sharing the same parent(s), one invisible
 *     junction node is placed between the parents and the children.
 *   - All sibling edges therefore emerge from the same point (the junction).
 *   - Junction X  = average centre-X of the parent(s).
 *   - Junction Y  = max(parent Y values) + NODE_H + JUNCTION_OFFSET.
 *     Using the deepest parent ensures cross-generation parents route the
 *     junction below the LOWER parent, not the shallower one.
 *
 * Edge routing:
 *   - SPOUSE  : left ↔ right handles, bezier arc.
 *   - SIBLING : left ↔ right handles, smoothstep.
 *   - PARENT_CHILD: split into two junction edges —
 *       parent  (bottom) → junction (top)   smoothstep
 *       junction(bottom) → child   (top)    smoothstep
 */

import type { MapData } from '@genyra/shared-types'
import { CANVAS } from '../../lib/design-tokens'

const { NODE_W, NODE_H, COUPLE_GAP, UNIT_GAP, GEN_GAP, JUNCTION_SIZE, JUNCTION_OFFSET } = CANVAS

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FlowEdgeMeta {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  relationshipType: string
  edgeType: 'relationshipEdge' | 'junctionEdge'
}

export interface VirtualJunction {
  id: string
  x: number
  y: number
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>
  junctions: VirtualJunction[]
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

  for (const e of edges) {
    if (e.relationshipType === 'SPOUSE') {
      spousePairs.set(e.sourceId, e.targetId)
      spousePairs.set(e.targetId, e.sourceId)
    }
    if (e.relationshipType === 'PARENT_CHILD') {
      if (!childrenOf.has(e.sourceId)) childrenOf.set(e.sourceId, new Set())
      childrenOf.get(e.sourceId)!.add(e.targetId)
      if (!parentsOf.has(e.targetId)) parentsOf.set(e.targetId, new Set())
      parentsOf.get(e.targetId)!.add(e.sourceId)
    }
  }

  // ── Generation assignment ──────────────────────────────────────────────────
  //
  // Problem with a simple BFS: married-in roots (Siti, Reza, Ayu, etc.) have
  // no parents, so they start at gen 0. Their children get gen 1 in the BFS.
  // Later, when we process the real grandparent (Ahmad gen 1), his children
  // have already been visited, so their gen is never corrected to gen 2.
  //
  // Solution: combined iterative propagation.
  //   - Seed: all nodes with no parents start at gen 0.
  //   - Each round: propagate children (child ≥ parent+1) AND resolve spouses
  //     (both at max of the pair). Only INCREASE gens, never decrease.
  //   - Repeat until stable. Guaranteed to converge because gens only increase
  //     and are bounded by the depth of the tree.
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

    // Child propagation: every child must be at least parent_gen + 1
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

    // Spouse resolution: both spouses must share the same (max) generation
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

  // Any nodes still unassigned (completely isolated) → generation 0
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
  // A unit is [male, female] or [single]. Male always on the left.
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

  // ── Build junction nodes ───────────────────────────────────────────────────
  const parentGroups = new Map<string, { parentIds: string[]; childIds: string[] }>()

  for (const [childId, pSet] of parentsOf) {
    const key = parentGroupKey([...pSet])
    if (!parentGroups.has(key)) {
      parentGroups.set(key, { parentIds: [...pSet].sort(), childIds: [] })
    }
    parentGroups.get(key)!.childIds.push(childId)
  }

  const junctions: VirtualJunction[] = []
  const juncIdByKey = new Map<string, string>()

  for (const [key, group] of parentGroups) {
    if (group.childIds.length === 0) continue

    // Average centre-X of all parents
    const avgCentreX =
      group.parentIds.reduce((sum, pid) => {
        const pos = positions.get(pid) ?? { x: 0, y: 0 }
        return sum + pos.x + NODE_W / 2
      }, 0) / group.parentIds.length

    // Use the DEEPEST parent Y so that cross-generation parents route the
    // junction below the lower parent's row (not the upper one).
    const maxParentY = Math.max(
      ...group.parentIds.map((pid) => positions.get(pid)?.y ?? 0),
    )

    const juncId = `junc_${key}`
    junctions.push({
      id:  juncId,
      x:   avgCentreX - JUNCTION_SIZE / 2,
      y:   maxParentY + NODE_H + JUNCTION_OFFSET,
    })
    juncIdByKey.set(key, juncId)
  }

  // ── Reposition children under their parent junction ───────────────────────
  //
  // The global generation layout above places all same-gen nodes in one flat
  // row. This pass redistributes each parent group's children to be centered
  // under the group's junction, pulling in each child's spouse so couples
  // remain adjacent. Groups are processed left-to-right so that when two
  // groups share a Y level, later groups don't overlap earlier ones.
  {
    const sortedGroups = [...parentGroups.entries()]
      .map(([key, group]) => ({
        key,
        group,
        junc: junctions.find((j) => j.id === `junc_${key}`)!,
      }))
      .filter((g) => g.junc != null && g.group.childIds.length > 0)
      .sort((a, b) => a.junc.x - b.junc.x)

    // rightEdge per Y level — prevents overlap between sibling-groups on the same row
    const rightEdgeByY = new Map<number, number>()
    const alreadyPlaced = new Set<string>()

    for (const { group, junc } of sortedGroups) {
      const children = [...group.childIds].filter((id) => !alreadyPlaced.has(id))
      if (children.length === 0) continue

      // Determine the Y for this child group (all children share the same gen)
      const childY = Math.max(...children.map((id) => positions.get(id)?.y ?? 0))

      // Sort children left-to-right to maintain visual order
      children.sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0))

      // Build couple-aware units: pair each child with their external spouse
      const seenInUnit = new Set<string>()
      const units: Array<{ ids: string[]; w: number }> = []

      for (const cid of children) {
        if (seenInUnit.has(cid)) continue
        seenInUnit.add(cid)

        const spouse = spousePairs.get(cid)
        if (spouse && !seenInUnit.has(spouse) && !children.includes(spouse)) {
          // External spouse — place as a couple unit (male left, female right)
          seenInUnit.add(spouse)
          const spouseNode = nodeById.get(spouse)
          const childNode  = nodeById.get(cid)
          const leftId  = spouseNode?.gender === 'MALE' && childNode?.gender !== 'MALE' ? spouse : cid
          const rightId = leftId === cid ? spouse : cid
          units.push({ ids: [leftId, rightId], w: NODE_W * 2 + COUPLE_GAP })
        } else if (spouse && children.includes(spouse) && !seenInUnit.has(spouse)) {
          // Sibling couple (incest edge case)
          seenInUnit.add(spouse)
          units.push({ ids: [cid, spouse], w: NODE_W * 2 + COUPLE_GAP })
        } else {
          units.push({ ids: [cid], w: NODE_W })
        }
      }

      const juncCenterX = junc.x + JUNCTION_SIZE / 2
      const n = units.length

      // Odd number of units: align the middle unit's centre over the junction.
      // Even number of units: centre the whole group over the junction.
      let startX: number
      if (n % 2 === 1) {
        const midIdx = Math.floor(n / 2)
        let widthBefore = 0
        for (let i = 0; i < midIdx; i++) widthBefore += units[i]!.w + UNIT_GAP
        startX = juncCenterX - units[midIdx]!.w / 2 - widthBefore
      } else {
        const totalW = units.reduce((s, u) => s + u.w, 0) + UNIT_GAP * Math.max(n - 1, 0)
        startX = juncCenterX - totalW / 2
      }

      // Enforce right-edge constraint so groups don't overlap on the same row
      const prevRight = rightEdgeByY.get(childY) ?? -Infinity
      if (startX < prevRight + UNIT_GAP) startX = prevRight + UNIT_GAP

      for (const unit of units) {
        const [a, b] = unit.ids
        if (b !== undefined) {
          positions.set(a!, { x: startX, y: childY })
          positions.set(b,  { x: startX + NODE_W + COUPLE_GAP, y: childY })
        } else {
          positions.set(a!, { x: startX, y: childY })
        }
        unit.ids.forEach((id) => alreadyPlaced.add(id))
        startX += unit.w + UNIT_GAP
      }

      rightEdgeByY.set(childY, startX - UNIT_GAP)

      // Recentre the junction over its repositioned children
      const childXs = group.childIds.map((id) => (positions.get(id)?.x ?? 0) + NODE_W / 2)
      const newJuncCX = (Math.min(...childXs) + Math.max(...childXs)) / 2
      junc.x = newJuncCX - JUNCTION_SIZE / 2
    }
  }

  // ── Final overlap resolution ───────────────────────────────────────────────
  // After child repositioning, nodes on the same row might still overlap.
  // Sort each Y-level by X and enforce a minimum gap between every adjacent pair.
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
  const flowEdges: FlowEdgeMeta[] = []

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

  // Junction routing edges (replace all PARENT_CHILD edges)
  for (const [key, group] of parentGroups) {
    const juncId = juncIdByKey.get(key)
    if (!juncId) continue

    for (const pid of group.parentIds) {
      flowEdges.push({
        id:               `${juncId}_p_${pid}`,
        source:           pid,
        target:           juncId,
        sourceHandle:     'bottom',
        targetHandle:     'top',
        relationshipType: 'PARENT_CHILD',
        edgeType:         'junctionEdge',
      })
    }

    for (const cid of group.childIds) {
      flowEdges.push({
        id:               `${juncId}_c_${cid}`,
        source:           juncId,
        target:           cid,
        sourceHandle:     'bottom',
        targetHandle:     'top',
        relationshipType: 'PARENT_CHILD',
        edgeType:         'junctionEdge',
      })
    }
  }

  return { positions, junctions, edges: flowEdges }
}
