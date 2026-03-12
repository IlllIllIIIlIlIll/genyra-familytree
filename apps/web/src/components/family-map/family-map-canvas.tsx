'use client'

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import { useMapUIStore } from '@/store/map-store'
import { PersonNodeComponent } from './person-node'
import { RelationshipEdgeComponent } from './relationship-edge'
import { ProfileCard } from '@/components/profile/profile-card'
import type { PersonNode } from '@genyra/shared-types'

const nodeTypes = { personNode: PersonNodeComponent }
const edgeTypes = { relationshipEdge: RelationshipEdgeComponent }

interface PersonNodeData extends Record<string, unknown> {
  node: PersonNode
  isCurrentUser: boolean
}

interface FamilyMapCanvasProps {
  familyGroupId: string
}

export function FamilyMapCanvas({ familyGroupId }: FamilyMapCanvasProps) {
  const { isProfilePanelOpen, selectedNodeId, closeProfilePanel, openProfilePanel } =
    useMapUIStore()

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['map-data', familyGroupId],
    queryFn: () => apiClient.getMapData(familyGroupId),
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PersonNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) =>
      apiClient.updateCanvasPosition(id, { canvasX: x, canvasY: y }),
  })

  // Transform API data into React Flow format
  useEffect(() => {
    if (!mapData) return

    const flowNodes: Node<PersonNodeData>[] = mapData.nodes.map((n) => ({
      id: n.id,
      type: 'personNode',
      position: { x: n.canvasX, y: n.canvasY },
      data: { node: n, isCurrentUser: false },
    }))

    const flowEdges: Edge[] = mapData.edges.map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      type: 'relationshipEdge',
      data: { relationshipType: e.relationshipType },
    }))

    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [mapData, setNodes, setEdges])

  // Debounced canvas position save on node drag
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<PersonNodeData>>[]) => {
      onNodesChange(changes)

      const positionChange = changes.find(
        (c): c is NodeChange<Node<PersonNodeData>> & { type: 'position'; dragging: false } =>
          c.type === 'position' && !('dragging' in c && c.dragging),
      )

      if (positionChange && 'position' in positionChange && positionChange.position) {
        const { id } = positionChange
        const { x, y } = positionChange.position

        if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current)
        positionSaveTimer.current = setTimeout(() => {
          updatePositionMutation.mutate({ id, x, y })
        }, 500)
      }
    },
    [onNodesChange, updatePositionMutation],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<PersonNodeData>) => {
      openProfilePanel(node.id)
    },
    [openProfilePanel],
  )

  const selectedNode = mapData?.nodes.find((n) => n.id === selectedNodeId)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-50">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-2 border-brand-400 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading your family tree…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-brand-50"
      >
        <Background color="#f0d8df" gap={24} size={1} />
        <Controls
          className="!shadow-sm !border-brand-100"
          showInteractive={false}
        />
        <MiniMap
          nodeColor="#e8829a"
          maskColor="rgba(248, 240, 242, 0.7)"
          className="!border-brand-100 !rounded-xl overflow-hidden"
        />
      </ReactFlow>

      {isProfilePanelOpen && selectedNode && (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <ProfileCard node={selectedNode} onClose={closeProfilePanel} />
        </div>
      )}
    </div>
  )
}
