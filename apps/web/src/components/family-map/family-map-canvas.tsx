'use client'

import {
  ReactFlow,
  ReactFlowProvider,
  Panel,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toPng } from 'html-to-image'
import { apiClient } from '@/lib/api-client'
import { saveTokens } from '@/lib/auth'
import { useMapUIStore, useAuthStore, useToastStore } from '@/store/map-store'
import { CANVAS, COLOR } from '@/lib/design-tokens'
import { PersonNodeComponent } from './person-node'
import { RelationshipEdgeComponent } from './relationship-edge'
import { BracketEdgeComponent } from './bracket-edge'
import { ProfileCard } from '@/components/profile/profile-card'
import { computeFamilyLayout } from './family-layout'
import { computeGenerations } from './generation-utils'
import type { PersonNode, Notification } from '@genyra/shared-types'

const nodeTypes = {
  personNode: PersonNodeComponent,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdgeComponent,
  bracketEdge:      BracketEdgeComponent,
}

interface PersonNodeData extends Record<string, unknown> {
  node: PersonNode
  isCurrentUser: boolean
}

type FlowNodeData = PersonNodeData

interface FamilyMapCanvasProps {
  familyGroupId: string
}

// Use visualViewport when available (more accurate on mobile — excludes browser chrome).
function getMinimapSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 120, height: 75 }
  const vp    = window.visualViewport
  const vw    = vp?.width  ?? window.innerWidth
  const vh    = vp?.height ?? window.innerHeight
  const ratio = vw / vh
  const BASE_H = 75
  if (ratio >= 1) {
    return { width: Math.min(Math.max(Math.round(BASE_H * ratio), 80), 200), height: BASE_H }
  }
  return { width: BASE_H, height: Math.min(Math.max(Math.round(BASE_H / ratio), 80), 150) }
}

// ── SVG icons ──────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// ── Inner component (must be inside ReactFlowProvider to use useReactFlow) ─────
function FamilyMapInner({ familyGroupId }: FamilyMapCanvasProps) {
  const { fitView, setCenter, getNode, getViewport, setViewport } = useReactFlow()
  const queryClient = useQueryClient()

  const {
    isProfilePanelOpen, selectedNodeId,
    setSelectedNode, closeProfilePanel, openProfilePanel,
    isCleanView, toggleCleanView,
  } = useMapUIStore()

  const router        = useRouter()
  const clearAuth     = useAuthStore((s) => s.clear)
  const setTokens     = useAuthStore((s) => s.setTokens)
  const setUser       = useAuthStore((s) => s.setUser)
  const setFamilies   = useAuthStore((s) => s.setFamilies)
  const families      = useAuthStore((s) => s.families)
  const currentUserId = useAuthStore((s) => s.userId)
  const role          = useAuthStore((s) => s.role)
  const isFamilyHead  = role === 'FAMILY_HEAD'
  const canvasRef     = useRef<HTMLDivElement>(null)
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressNodeId = useRef<string | null>(null)
  const [minimapSize, setMinimapSize]                 = useState(getMinimapSize)
  const [isEditingName, setIsEditingName]             = useState(false)
  const [nameDraft, setNameDraft]                     = useState('')
  const [isNotifPanelOpen, setIsNotifPanelOpen]       = useState(false)
  const [isFamilySwitcherOpen, setIsFamilySwitcherOpen] = useState(false)
  const [joinFamilyOpen, setJoinFamilyOpen]             = useState(false)
  const [joinInviteCode, setJoinInviteCode]             = useState('')
  const [genOffset, setGenOffset]                       = useState(0)
  const toast = useToastStore((s) => s.toast)

  const GEN_WINDOW = 4

  // Notification last-read timestamp stored per user in localStorage
  const notifKey = currentUserId ? `notif_last_read_${currentUserId}` : null
  const getLastRead = useCallback((): number => {
    if (!notifKey) return 0
    return Number(localStorage.getItem(notifKey) ?? 0)
  }, [notifKey])

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => apiClient.getNotifications(),
    enabled:  !!currentUserId,
    refetchInterval: 30_000,
  })

  const unreadCount = useMemo(() => {
    const lastRead = getLastRead()
    return notifications.filter((n) => new Date(n.createdAt).getTime() > lastRead).length
  }, [notifications, getLastRead])

  const handleOpenNotif = useCallback(() => {
    setIsNotifPanelOpen(true)
    if (notifKey) localStorage.setItem(notifKey, String(Date.now()))
  }, [notifKey])

  const handleCloseNotif = useCallback(() => setIsNotifPanelOpen(false), [])

  // ── Family switcher ─────────────────────────────────────────────────────────

  const { data: fetchedFamilies } = useQuery({
    queryKey: ['my-families'],
    queryFn:  () => apiClient.getMyFamilies(),
    enabled:  !!currentUserId,
  })

  useEffect(() => {
    if (fetchedFamilies) setFamilies(fetchedFamilies)
  }, [fetchedFamilies, setFamilies])

  const switchFamilyMutation = useMutation({
    mutationFn: (fid: string) => apiClient.switchFamily(fid),
    onSuccess: (tokens) => {
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]!)) as { sub: string; role: string; fid: string }
      saveTokens(tokens.accessToken, tokens.refreshToken)
      setTokens(tokens)
      setUser({ userId: payload.sub, familyGroupId: payload.fid, role: payload.role })
      void queryClient.invalidateQueries({ queryKey: ['map-data'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setIsFamilySwitcherOpen(false)
    },
  })

  const joinAdditionalMutation = useMutation({
    mutationFn: (code: string) => apiClient.joinAdditionalFamily(code),
    onSuccess: (res) => {
      toast(res.message, 'success')
      setJoinFamilyOpen(false)
      setJoinInviteCode('')
      setIsFamilySwitcherOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['my-families'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to join family'
      toast(msg, 'error')
    },
  })

  useEffect(() => {
    const update = () => setMinimapSize(getMinimapSize())
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['map-data', familyGroupId],
    queryFn:  () => apiClient.getMapData(familyGroupId),
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([])
  const [rawEdges, setRawEdges, onEdgesChange] = useEdgesState<Edge>([])
  const positionSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldFitViewRef   = useRef(false)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [translateExtent, setTranslateExtent] = useState<[[number, number], [number, number]]>(
    [[-Infinity, -Infinity], [Infinity, Infinity]],
  )

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) =>
      apiClient.updateCanvasPosition(id, { canvasX: x, canvasY: y }),
  })

  // ── Generation window ────────────────────────────────────────────────────
  const genMap = useMemo(
    () => (mapData ? computeGenerations(mapData.nodes, mapData.edges) : new Map<string, number>()),
    [mapData],
  )
  const maxGen = useMemo(() => (genMap.size > 0 ? Math.max(...genMap.values()) : 0), [genMap])
  const totalGenerations = maxGen + 1

  // anchorGen = newest generation in the current window
  const anchorGen  = Math.max(0, maxGen - genOffset)
  const windowMax  = anchorGen
  const windowMin  = Math.max(0, anchorGen - GEN_WINDOW + 1)
  const canGoOlder = windowMin > 0
  const canGoNewer = genOffset > 0

  const filteredMapData = useMemo(() => {
    if (!mapData) return null
    if (totalGenerations <= GEN_WINDOW) return mapData

    const visibleIds = new Set(
      mapData.nodes
        .filter((n) => { const g = genMap.get(n.id) ?? 0; return g >= windowMin && g <= windowMax })
        .map((n) => n.id),
    )
    return {
      familyName: mapData.familyName,
      nodes: mapData.nodes.filter((n) => visibleIds.has(n.id)),
      edges: mapData.edges.filter((e) => visibleIds.has(e.sourceId) && visibleIds.has(e.targetId)),
    }
  // windowMin/windowMax derived from genOffset + genMap; list all real deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData, genMap, genOffset, totalGenerations])

  // Reset to newest window whenever the family changes
  useEffect(() => { setGenOffset(0) }, [familyGroupId])

  // Refit view when generation window slides
  useEffect(() => { shouldFitViewRef.current = true }, [genOffset])

  // Close profile panel if selected node scrolled out of view
  useEffect(() => {
    if (!selectedNodeId || !mapData || totalGenerations <= GEN_WINDOW) return
    const nodeGen = genMap.get(selectedNodeId)
    if (nodeGen !== undefined && (nodeGen < windowMin || nodeGen > windowMax)) {
      closeProfilePanel()
    }
  }, [genOffset, genMap, mapData, selectedNodeId, totalGenerations, windowMin, windowMax, closeProfilePanel])

  useEffect(() => {
    if (!filteredMapData) return
    const { positions, edges: edgeMetas } = computeFamilyLayout(filteredMapData)

    const personNodes: Node<FlowNodeData>[] = filteredMapData.nodes.map((n) => {
      // H-08: prefer stored position when user has manually dragged the node
      const hasStoredPos = n.canvasX !== 0 || n.canvasY !== 0
      const pos = hasStoredPos
        ? { x: n.canvasX, y: n.canvasY }
        : (positions.get(n.id) ?? { x: 0, y: 0 })
      return {
        id: n.id, type: 'personNode', position: pos,
        data: { node: n, isCurrentUser: n.userId === currentUserId } satisfies PersonNodeData,
        draggable: true,
      }
    })

    setNodes(personNodes)
    setRawEdges(edgeMetas.map((em) => ({
      id: em.id, source: em.source, target: em.target,
      sourceHandle: em.sourceHandle, targetHandle: em.targetHandle,
      type: em.edgeType,
      data: {
        relationshipType: em.relationshipType,
        ...(em.bracketParentIds && {
          parentIds:          em.bracketParentIds,
          childIds:           em.bracketChildIds,
          junctionY:          em.bracketJunctionY,
          parentStemOffsets:  em.bracketParentStemOffsets,
        }),
      },
    })))

    // Compute translate extent from layout bounding box + generous padding
    if (positions.size > 0) {
      const PAD = 600
      const xs = [...positions.values()].map((p) => p.x)
      const ys = [...positions.values()].map((p) => p.y)
      setTranslateExtent([
        [Math.min(...xs) - PAD, Math.min(...ys) - PAD],
        [Math.max(...xs) + CANVAS.NODE_W + PAD, Math.max(...ys) + CANVAS.NODE_H + PAD],
      ])
    }

    if (shouldFitViewRef.current) {
      shouldFitViewRef.current = false
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitView({ padding: CANVAS.FIT_PADDING, duration: 400 })
        })
      })
    }
  // layoutVersion forces re-layout even when mapData hasn't changed (drag reset).
  // genOffset triggers a new layout when the generation window slides.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMapData, layoutVersion, setNodes, setRawEdges, currentUserId, fitView])

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<FlowNodeData>>[]) => {
      onNodesChange(changes)
      for (const c of changes) {
        if (
          c.type === 'position' && 'dragging' in c && !c.dragging &&
          'position' in c && c.position != null && !c.id.startsWith('junc_')
        ) {
          const pos = c.position
          if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current)
          positionSaveTimer.current = setTimeout(() => {
            updatePositionMutation.mutate({ id: c.id, x: pos.x, y: pos.y })
          }, 500)
          break
        }
      }
    },
    [onNodesChange, updatePositionMutation],
  )

  // Single tap/click → select node for edge highlighting + center camera.
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<FlowNodeData>) => {
      if (node.type !== 'personNode') return
      setSelectedNode(node.id)
      setCenter(
        node.position.x + CANVAS.NODE_W / 2,
        node.position.y + CANVAS.NODE_H / 2,
        { zoom: 1.5, duration: 600 },
      )
    },
    [setSelectedNode, setCenter],
  )

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    longPressNodeId.current = null
  }, [])

  // ReactFlow v12 does not expose onNodeMouseDown, so we attach the handler to
  // the canvas wrapper div and resolve the node id from the DOM hierarchy.
  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      cancelLongPress()
      // Walk up the DOM to find a ReactFlow node element (has data-id attribute)
      const el = (event.target as HTMLElement).closest<HTMLElement>('[data-id]')
      if (!el) return
      const nodeId = el.getAttribute('data-id')
      if (!nodeId) return
      // Only trigger for personNode types
      const rfNode = getNode(nodeId)
      if (!rfNode || rfNode.type !== 'personNode') return

      longPressNodeId.current = nodeId
      longPressTimer.current = setTimeout(() => {
        longPressNodeId.current = null
        openProfilePanel(nodeId)
        const freshNode = getNode(nodeId)
        if (freshNode) {
          setCenter(
            freshNode.position.x + CANVAS.NODE_W / 2,
            freshNode.position.y + CANVAS.NODE_H / 2,
            { zoom: 1.5, duration: 600 },
          )
        }
      }, 500)
    },
    [cancelLongPress, openProfilePanel, getNode, setCenter],
  )

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => apiClient.updateFamilyName(familyGroupId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      setIsEditingName(false)
    },
  })

  const handleNameSave = useCallback(() => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === mapData?.familyName) { setIsEditingName(false); return }
    updateNameMutation.mutate(trimmed)
  }, [nameDraft, mapData?.familyName, updateNameMutation])

  const handleLogout = useCallback(() => {
    clearAuth()
    router.push('/login')
  }, [clearAuth, router])

  // Refresh: bump layoutVersion so the layout useEffect always re-runs (even if
  // mapData hasn't changed), and flag fitView to fire after re-layout.
  const handleRefresh = useCallback(() => {
    shouldFitViewRef.current = true
    setLayoutVersion((v) => v + 1)
    void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
  }, [queryClient, familyGroupId])

  // Navigate to the current user's person node, centred and zoomed.
  const currentUserPersonNode = mapData?.nodes.find((n) => n.userId === currentUserId)
  const handleViewCurrentUser = useCallback(() => {
    if (!currentUserPersonNode) return
    const rfNode = getNode(currentUserPersonNode.id)
    if (!rfNode) return
    setCenter(
      rfNode.position.x + CANVAS.NODE_W / 2,
      rfNode.position.y + CANVAS.NODE_H / 2,
      { zoom: 1.5, duration: 600 },
    )
  }, [currentUserPersonNode, getNode, setCenter])

  // Download: fit the view first so the export shows the full tree.
  const handleDownload = useCallback(async () => {
    const el = canvasRef.current
    if (!el) return
    const savedViewport = getViewport()
    try {
      await fitView({ padding: CANVAS.FIT_PADDING, duration: 0 })
      // Give the browser a paint cycle to apply the new viewport transform.
      await new Promise<void>((r) => { requestAnimationFrame(() => { requestAnimationFrame(() => r()) }) })
      const dataUrl = await toPng(el, { backgroundColor: '#f5f0e8', quality: 0.95 })
      const a = document.createElement('a')
      a.href     = dataUrl
      a.download = `${mapData?.familyName ?? 'family-tree'}.png`
      a.click()
    } catch {
      // Silent fail — toPng can fail on cross-origin images
    } finally {
      setViewport(savedViewport, { duration: 0 })
    }
  }, [mapData?.familyName, fitView, getViewport, setViewport])

  // Highlight only directly-connected edges for the selected node.
  //
  // Relationship edges (SPOUSE / SIBLING): highlight if node is source or target.
  // Bracket edges: highlight the whole bracket if node is a PARENT.
  //   If node is a CHILD, inject highlightedChildId instead (only that stem lights up).
  const highlightedEdgeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    const ids = new Set<string>()
    for (const e of rawEdges) {
      const d       = e.data as Record<string, unknown> | undefined
      const edgeType = (d?.edgeType ?? e.type) as string | undefined

      if (edgeType === 'bracketEdge') {
        const parents = (d?.parentIds as string[] | undefined) ?? []
        // Only fully highlight when selected node is a PARENT (owns this bracket)
        if (parents.includes(selectedNodeId)) ids.add(e.id)
        // Child case handled via highlightedChildId in displayEdges below
      } else {
        // SPOUSE / SIBLING: direct connection only
        if (e.source === selectedNodeId || e.target === selectedNodeId) ids.add(e.id)
      }
    }
    return ids
  }, [selectedNodeId, rawEdges])

  const displayEdges = useMemo(
    () => rawEdges.map((e) => {
      const d        = e.data as Record<string, unknown> | undefined
      const edgeType = (d?.edgeType ?? e.type) as string | undefined
      const extra: Record<string, unknown> = {}

      if (edgeType === 'bracketEdge' && selectedNodeId) {
        const children = (d?.childIds as string[] | undefined) ?? []
        if (children.includes(selectedNodeId)) {
          extra.highlightedChildId = selectedNodeId
        }
      }

      return {
        ...e,
        data: { ...(d ?? {}), highlighted: highlightedEdgeIds.has(e.id), ...extra },
      }
    }),
    [rawEdges, highlightedEdgeIds, selectedNodeId],
  )

  const selectedNode = mapData?.nodes.find((n) => n.id === selectedNodeId)
  const hasSpouse = selectedNode
    ? (mapData?.edges ?? []).some(
        (e) =>
          e.relationshipType === 'SPOUSE' &&
          e.divorceDate === null &&
          (e.sourceId === selectedNode.id || e.targetId === selectedNode.id),
      )
    : false

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#f5f0e8' }}>
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-2 border-brand-400 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading your family tree…</p>
        </div>
      </div>
    )
  }

  return (
    // touch-action: none overrides `html { touch-action: manipulation }` in globals.css
    // which would otherwise swallow React Flow's pointer drag events on touch screens.
    <div className={`flex-1 flex flex-col ${isFamilyHead ? 'pb-14' : ''}`} style={{ touchAction: 'none' }}>

      {/* ── Family header bar (hidden in clean view) ────────────────────────── */}
      {!isCleanView && (
        <header className="flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-sm border-b border-stone-200 shrink-0 z-20">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-brand-400 shrink-0">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave()
                    if (e.key === 'Escape') setIsEditingName(false)
                  }}
                  onBlur={handleNameSave}
                  className="text-sm font-semibold text-slate-700 bg-stone-100 rounded-lg px-2 py-0.5 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            ) : (
              <>
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {mapData?.familyName ?? 'Family Map'}
                </span>
                {isFamilyHead && (
                  <button
                    onClick={() => { setNameDraft(mapData?.familyName ?? ''); setIsEditingName(true) }}
                    className="p-1 rounded text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                    title="Edit family name"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setIsFamilySwitcherOpen((v) => !v)}
                    className="p-1 rounded text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                    title="Switch family"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {isFamilySwitcherOpen && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => { setIsFamilySwitcherOpen(false); setJoinFamilyOpen(false) }} />
                      <div className="absolute left-0 top-7 z-[41] w-56 bg-white rounded-xl shadow-lg border border-stone-100 py-1 overflow-hidden">
                        {families.map((f) => (
                          <button
                            key={f.id}
                            disabled={f.id === familyGroupId || switchFamilyMutation.isPending}
                            onClick={() => switchFamilyMutation.mutate(f.id)}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-stone-50 disabled:opacity-50 flex items-center justify-between gap-2"
                          >
                            <span className="truncate font-medium text-slate-700">{f.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0 uppercase tracking-wide">{f.role === 'FAMILY_HEAD' ? 'Head' : 'Member'}</span>
                          </button>
                        ))}
                        {families.length < 3 && (
                          <>
                            {families.length > 0 && <div className="border-t border-stone-100 mx-2 my-1" />}
                            {!joinFamilyOpen ? (
                              <button
                                onClick={() => setJoinFamilyOpen(true)}
                                className="w-full text-left px-3 py-2.5 text-sm text-brand-600 hover:bg-brand-50 flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                                </svg>
                                Join another family
                              </button>
                            ) : (
                              <div className="px-3 py-2 space-y-2">
                                <input
                                  autoFocus
                                  value={joinInviteCode}
                                  onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                                  placeholder="Invite code"
                                  autoCapitalize="characters"
                                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-400 font-mono tracking-wider"
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => joinAdditionalMutation.mutate(joinInviteCode)}
                                    disabled={!joinInviteCode || joinAdditionalMutation.isPending}
                                    className="flex-1 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                                  >
                                    {joinAdditionalMutation.isPending ? 'Joining…' : 'Join'}
                                  </button>
                                  <button
                                    onClick={() => { setJoinFamilyOpen(false); setJoinInviteCode('') }}
                                    className="flex-1 py-1.5 text-xs font-medium bg-stone-100 text-slate-600 rounded-lg hover:bg-stone-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleOpenNotif}
              className="relative p-2 rounded-lg text-slate-500 hover:bg-stone-100 transition-colors"
              title="Notifications"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full bg-brand-500 text-white text-[9px] font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg text-slate-500 hover:bg-stone-100 transition-colors"
              title="Download family tree as PNG"
            >
              <DownloadIcon />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:bg-stone-100 transition-colors"
              title="Log out"
            >
              <LogoutIcon />
            </button>
          </div>
        </header>
      )}

      {/* ── Canvas area ────────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="flex-1 relative"
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
      >
        <ReactFlow
          nodes={nodes}
          edges={displayEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeDragStart={cancelLongPress}
          onNodeMouseLeave={cancelLongPress}
          onPaneClick={closeProfilePanel}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={true}
          elementsSelectable={true}
          panOnDrag={true}
          fitView
          fitViewOptions={{ padding: CANVAS.FIT_PADDING }}
          minZoom={CANVAS.MIN_ZOOM}
          maxZoom={CANVAS.MAX_ZOOM}
          translateExtent={translateExtent}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#f5f0e8' }}
        >
          <Background
            variant={BackgroundVariant.Cross}
            color={COLOR.MAP_GRID_DOT}
            gap={32}
            size={5}
          />

          {/* ── Person + Refresh buttons (above the standard Controls) ───────── */}
          {!isCleanView && (
            <Panel position="bottom-left" style={{ bottom: 110 }}>
              <div className="flex flex-col gap-1">
                {currentUserPersonNode && (
                  <button
                    onClick={handleViewCurrentUser}
                    className="react-flow__controls-button"
                    title="Find me on the map"
                  >
                    <PersonIcon />
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  className="react-flow__controls-button"
                  title="Reset tree layout"
                >
                  <RefreshIcon />
                </button>
              </div>
            </Panel>
          )}

          {!isCleanView && (
            <MiniMap
              nodeColor={COLOR.MINIMAP_NODE}
              maskColor={COLOR.MINIMAP_MASK}
              className="!border-stone-200 !rounded-xl overflow-hidden"
              style={{ width: minimapSize.width, height: minimapSize.height }}
            />
          )}

          {/* ── Generation navigation pill ───────────────────────────────── */}
          {!isCleanView && totalGenerations > GEN_WINDOW && (
            <Panel position="bottom-center" style={{ bottom: isFamilyHead ? 72 : 16 }}>
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-stone-200 px-1 py-1">
                <button
                  onClick={() => { setGenOffset((o) => o + 1) }}
                  disabled={!canGoOlder}
                  aria-label="Show older generations"
                  className="flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:bg-stone-100 disabled:opacity-30 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="text-xs font-medium text-slate-600 tabular-nums px-1 min-w-[72px] text-center">
                  Gen {windowMin + 1}–{windowMax + 1}
                  <span className="text-slate-400"> / {totalGenerations}</span>
                </span>
                <button
                  onClick={() => { setGenOffset((o) => o - 1) }}
                  disabled={!canGoNewer}
                  aria-label="Show newer generations"
                  className="flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:bg-stone-100 disabled:opacity-30 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>

        {/* ── Eye toggle (always visible, top-right corner of canvas) ─────── */}
        <button
          onClick={toggleCleanView}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-stone-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
          title={isCleanView ? 'Show interface' : 'Hide interface (clean view)'}
        >
          {isCleanView ? <EyeOffIcon /> : <EyeIcon />}
        </button>

        {/* ── Dark backdrop when a card is selected ───────────────────────── */}
        {!isCleanView && isProfilePanelOpen && selectedNode && (
          <div className="absolute inset-0 z-[9] bg-black/40 pointer-events-none transition-opacity duration-200" />
        )}

        {/* ── Profile card (hidden in clean view, closes via onPaneClick) ───── */}
        {!isCleanView && isProfilePanelOpen && selectedNode && (
          <div className="absolute inset-x-0 bottom-0 z-10">
            <ProfileCard node={selectedNode} hasSpouse={hasSpouse} />
          </div>
        )}

        {/* ── Notification dropdown (compact, top-right) ──────────────────── */}
        {isNotifPanelOpen && (
          <>
            <div className="absolute inset-0 z-[30]" onClick={handleCloseNotif} />
            <div className="absolute top-12 right-3 z-[31] w-72 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 pt-3 pb-2">Notifications</p>
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-5 px-4">No notifications yet.</p>
              ) : (
                <ul className="divide-y divide-stone-50 max-h-72 overflow-y-auto">
                  {notifications.map((n: Notification) => (
                    <li key={n.id} className="px-4 py-3">
                      <p className="text-xs text-slate-700 leading-snug">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="pb-2" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Public export: wraps with ReactFlowProvider so useReactFlow() works ────────
export function FamilyMapCanvas({ familyGroupId }: FamilyMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <FamilyMapInner familyGroupId={familyGroupId} />
    </ReactFlowProvider>
  )
}
