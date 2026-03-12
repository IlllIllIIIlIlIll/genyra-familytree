/**
 * Family tree auto-layout engine.
 *
 * Generation rules:
 *   - Nodes with no parents = generation 0.
 *   - Children = parent generation + 1.
 *   - Spouses always share the same generation (pulled to match their partner).
 *
 * Junction nodes:
 *   - For every set of children sharing the same parent(s), one invisible
 *     junction node is placed between the parents and the children.
 *   - All sibling edges therefore emerge from the same point (the junction).
 *   - Junction X  = average centre-X of the parent(s).
 *   - Junction Y  = parent_Y + NODE_H + JUNCTION_OFFSET.
 *
 * Edge routing:
 *   - SPOUSE  : left ↔ right handles, straight horizontal line.
 *   - SIBLING : left ↔ right handles, smoothstep horizontal.
 *   - PARENT_CHILD: split into two junction edges —
 *       parent  (bottom) → junction (top)   straight diagonal
 *       junction(bottom) → child   (top)    straight vertical
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

  // ── Generation assignment (BFS from roots) ─────────────────────────────────
  // We treat spouse pairs as a single "BFS unit" to ensure they always share
  // a generation even if one is a child of another level.
  const generation = new Map<string, number>()
  const roots = nodes.filter((n) => (parentsOf.get(n.id)?.size ?? 0) === 0)
  const queue: Array<{ id: string; gen: number }> = roots.map((r) => ({ id: r.id, gen: 0 }))

  const processed = new Set<string>()

  while (queue.length > 0) {
    const item = queue.shift()!
    if (processed.has(item.id)) continue
    processed.add(item.id)

    // Assign current gen
    generation.set(item.id, item.gen)

    // Spouse MUST share the same gen
    const partnerId = spousePairs.get(item.id)
    if (partnerId) {
      generation.set(partnerId, item.gen)
      processed.add(partnerId)
    }

    // Process children of both partners
    const unitIds = partnerId ? [item.id, partnerId] : [item.id]
    for (const uid of unitIds) {
      for (const childId of childrenOf.get(uid) ?? []) {
        if (!processed.has(childId)) {
          queue.push({ id: childId, gen: item.gen + 1 })
        }
      }
    }
  }

  // Disconnected nodes → generation 0 (Level 0)
  for (const n of nodes) {
    if (!generation.has(n.id)) {
      generation.set(n.id, 0)
    }
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
      if (partner && !visited.has(partner)) {
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
  // Group children by their parent set so siblings share one junction.
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

    const parentY = positions.get(group.parentIds[0]!)?.y ?? 0
    const juncId  = `junc_${key}`

    junctions.push({
      id:  juncId,
      x:   avgCentreX - JUNCTION_SIZE / 2,
      y:   parentY + NODE_H + JUNCTION_OFFSET,
    })
    juncIdByKey.set(key, juncId)
  }

  // ── Build edges ────────────────────────────────────────────────────────────
  const flowEdges: FlowEdgeMeta[] = []

  for (const e of edges) {
    // PARENT_CHILD is replaced by junction edges below — skip here
    if (e.relationshipType === 'PARENT_CHILD') continue

    const srcPos   = positions.get(e.sourceId)
    const tgtPos   = positions.get(e.targetId)
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

  // Add junction routing edges (replace all PARENT_CHILD edges)
  for (const [key, group] of parentGroups) {
    const juncId = juncIdByKey.get(key)
    if (!juncId) continue

    // Each parent → junction
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

    // Junction → each child
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
