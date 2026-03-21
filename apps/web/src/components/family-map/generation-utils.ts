import type { PersonNode, RelationshipEdge } from '@genyra/shared-types'

/**
 * Assigns a generation number to every node in the family.
 *
 * Strategy:
 *  1. BFS from root nodes (nodes with no parents) — generation 0.
 *     Each child gets parent's generation + 1.
 *  2. After BFS, fill in spouse nodes that weren't reachable via parent-child
 *     (e.g. a placeholder mother with no registered parents).
 *     They inherit their spouse's generation.
 *  3. Any remaining isolated nodes default to generation 0.
 */
export function computeGenerations(
  nodes: PersonNode[],
  edges: RelationshipEdge[],
): Map<string, number> {
  const genMap          = new Map<string, number>()
  const parentToChildren = new Map<string, string[]>()
  const childToParents  = new Map<string, string[]>()
  const spouseOf        = new Map<string, string>()

  for (const edge of edges) {
    if (edge.relationshipType === 'PARENT_CHILD') {
      const ch = parentToChildren.get(edge.sourceId) ?? [];  parentToChildren.set(edge.sourceId, [...ch, edge.targetId])
      const pa = childToParents.get(edge.targetId)  ?? [];  childToParents.set(edge.targetId,  [...pa, edge.sourceId])
    } else if (edge.relationshipType === 'SPOUSE') {
      spouseOf.set(edge.sourceId, edge.targetId)
      spouseOf.set(edge.targetId, edge.sourceId)
    }
  }

  // BFS from roots
  const roots = nodes.filter((n) => !childToParents.has(n.id))
  const queue: Array<{ id: string; gen: number }> = roots.map((r) => ({ id: r.id, gen: 0 }))
  while (queue.length > 0) {
    const item = queue.shift()!
    if (genMap.has(item.id)) continue
    genMap.set(item.id, item.gen)
    for (const childId of parentToChildren.get(item.id) ?? []) {
      if (!genMap.has(childId)) queue.push({ id: childId, gen: item.gen + 1 })
    }
  }

  // Propagate to spouses not reached by parent-child BFS
  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) {
      if (!genMap.has(node.id)) {
        const spouseId = spouseOf.get(node.id)
        if (spouseId !== undefined && genMap.has(spouseId)) {
          genMap.set(node.id, genMap.get(spouseId)!)
          changed = true
        }
      }
    }
  }

  // Truly isolated nodes → gen 0
  for (const node of nodes) {
    if (!genMap.has(node.id)) genMap.set(node.id, 0)
  }

  return genMap
}
