'use client'

export function CanvasSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        {/* Top generation row */}
        <div className="flex gap-8">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-stone-200" />
              <div className="w-20 h-3 rounded bg-stone-200" />
              <div className="w-14 h-2 rounded bg-stone-100" />
            </div>
          ))}
        </div>
        {/* Connector line */}
        <div className="w-px h-8 bg-stone-200" />
        {/* Middle row */}
        <div className="flex gap-12">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-stone-200" />
              <div className="w-20 h-3 rounded bg-stone-200" />
              <div className="w-16 h-2 rounded bg-stone-100" />
            </div>
          ))}
        </div>
        <p className="text-stone-400 text-sm mt-4">Loading family tree…</p>
      </div>
    </div>
  )
}
