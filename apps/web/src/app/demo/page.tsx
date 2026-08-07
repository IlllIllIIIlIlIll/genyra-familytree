'use client'

import dynamic from 'next/dynamic'

// Deliberately NOT nested under (app) — that layout redirects to /login when
// there's no accessToken. The public demo must be reachable with zero auth.
// ReactFlow reads window/DOM APIs, so it's loaded client-side only (matches
// how the authenticated map canvas is consumed).
const DemoMapCanvas = dynamic(
  () => import('@/components/family-map/demo-map-canvas').then((m) => m.DemoMapCanvas),
  { ssr: false },
)

export default function DemoPage() {
  return (
    <div className="h-dvh flex flex-col">
      <DemoMapCanvas />
    </div>
  )
}
