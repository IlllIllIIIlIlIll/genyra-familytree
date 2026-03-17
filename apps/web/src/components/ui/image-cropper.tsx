'use client'

import { useState, useCallback, useEffect, type FC } from 'react'
import Cropper, { type CropperProps } from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { cn } from '@/lib/utils'

// ── Ratio presets ─────────────────────────────────────────────────────────────

interface RatioPreset { label: string; value: number | null }

const RATIOS: RatioPreset[] = [
  { label: 'Free',   value: null },
  { label: '1 : 1',  value: 1 },
  { label: '4 : 3',  value: 4 / 3 },
  { label: '3 : 4',  value: 3 / 4 },
  { label: '16 : 9', value: 16 / 9 },
  { label: '9 : 16', value: 9 / 16 },
]

// ── Canvas crop → data URL ────────────────────────────────────────────────────

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    // blob: URLs are same-origin — crossOrigin causes CORS failure in some browsers
    if (!url.startsWith('blob:')) img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

async function cropToDataUrl(
  imageSrc: string,
  pixelCrop: Area,
  maxPx = 1200,
): Promise<string> {
  const image  = await createImage(imageSrc)
  const canvas = document.createElement('canvas')

  // Cap output dimensions to avoid massive base64 strings in the DB
  const scale = Math.min(1, maxPx / Math.max(pixelCrop.width, pixelCrop.height))
  canvas.width  = Math.round(pixelCrop.width  * scale)
  canvas.height = Math.round(pixelCrop.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D context')

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    canvas.width, canvas.height,
  )

  return canvas.toDataURL('image/jpeg', 0.88)
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ImageCropperProps {
  file: File
  /** Lock to this aspect ratio initially. null / undefined = Free. */
  defaultAspect?: number
  /** Max output dimension in px (default 1200, use 400 for avatars) */
  maxOutputPx?: number
  /** Called with base64 data URL when user confirms */
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ImageCropper: FC<ImageCropperProps> = ({
  file,
  defaultAspect,
  maxOutputPx = 1200,
  onConfirm,
  onCancel,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop,     setCrop]     = useState<Point>({ x: 0, y: 0 })
  const [zoom,     setZoom]     = useState(1)
  const [aspect,   setAspect]   = useState<number | null>(defaultAspect ?? 1)

  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  // Create blob URL in effect — avoids React Strict Mode double-invoke revoke bug
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function switchAspect(value: number | null) {
    setAspect(value)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  async function handleConfirm() {
    if (!croppedAreaPixels || !imageSrc) return
    setSaving(true)
    try {
      const dataUrl = await cropToDataUrl(imageSrc, croppedAreaPixels, maxOutputPx)
      onConfirm(dataUrl)
    } finally {
      setSaving(false)
    }
  }

  const cropperAspectProps: Partial<CropperProps> = aspect !== null ? { aspect } : {}

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-black select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/60 backdrop-blur-sm">
        <button
          type="button"
          onClick={onCancel}
          className="text-white/60 hover:text-white text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <p className="text-white/90 text-sm font-semibold tracking-wide">Crop Image</p>
        <button
          type="button"
          onClick={() => { void handleConfirm() }}
          disabled={saving || !croppedAreaPixels}
          className="text-brand-300 hover:text-brand-200 text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          {saving ? 'Applying…' : 'Use Photo'}
        </button>
      </div>

      {/* Cropper */}
      <div className="relative flex-1 min-h-0">
        {!imageSrc && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </div>
        )}
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={0.5}
            maxZoom={4}
            zoomSpeed={0.1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            {...cropperAspectProps}
            style={{
              containerStyle: { background: '#000' },
              cropAreaStyle:  { border: '2px solid rgba(255,255,255,0.8)' },
            }}
          />
        )}
      </div>

      {/* Ratio pills */}
      <div className="shrink-0 bg-black/60 backdrop-blur-sm px-4 pt-3 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-0.5 justify-center">
          {RATIOS.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => switchAspect(r.value)}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                aspect === r.value
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-white/55 border-white/20 hover:border-white/50 hover:text-white',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
