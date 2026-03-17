'use client'

import { useCallback, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useToastStore } from '@/store/map-store'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ImageCropper } from '@/components/ui/image-cropper'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { PersonPhoto } from '@genyra/shared-types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

function resolveUrl(url: string): string {
  return url.startsWith('/uploads/') ? `${API_URL}${url}` : url
}

export default function ProfilePage() {
  const params        = useParams()
  const router        = useRouter()
  const personId      = params['person-id'] as string
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const authUserId    = useAuthStore((s) => s.userId)
  const role          = useAuthStore((s) => s.role)
  const toast         = useToastStore((s) => s.toast)
  const queryClient   = useQueryClient()

  // ── Data ────────────────────────────────────────────────────────────────────

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['map-data', familyGroupId],
    queryFn:  () => apiClient.getMapData(familyGroupId!),
    enabled:  !!familyGroupId,
  })

  const { data: photos = [] } = useQuery({
    queryKey: ['photos', personId],
    queryFn:  () => apiClient.getPersonPhotos(personId),
    enabled:  !!personId,
  })

  const node = mapData?.nodes.find((n) => n.id === personId)

  // ── Photo upload ─────────────────────────────────────────────────────────

  const photoInputRef    = useRef<HTMLInputElement>(null)
  const [cropFile, setCropFile]     = useState<File | null>(null)
  const [lightbox, setLightbox]     = useState<PersonPhoto | null>(null)

  const uploadMutation = useMutation({
    mutationFn: (dataUrl: string) => apiClient.uploadPersonPhoto(personId, dataUrl),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['photos', personId] })
      toast('Photo added', 'success')
    },
    onError: () => toast('Failed to upload photo', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePersonPhoto(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['photos', personId] })
      setLightbox(null)
      toast('Photo removed', 'success')
    },
    onError: () => toast('Failed to delete photo', 'error'),
  })

  function handlePhotoFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      toast('Image must be under 20 MB', 'error')
      return
    }
    e.target.value = ''
    setCropFile(file)
  }

  const handleCropConfirm = useCallback((dataUrl: string) => {
    setCropFile(null)
    uploadMutation.mutate(dataUrl)
  }, [uploadMutation])

  const handleCropCancel = useCallback(() => setCropFile(null), [])

  // ── Loading / not found ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    )
  }

  if (!node) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-stone-50 p-8">
        <p className="text-slate-400">Person not found.</p>
        <Button variant="secondary" onClick={() => router.back()}>Back</Button>
      </div>
    )
  }

  const canEditPhotos = node.userId === authUserId || role === 'FAMILY_HEAD'

  const birthYear = node.birthDate ? new Date(node.birthDate).getFullYear() : null
  const deathYear = node.deathDate ? new Date(node.deathDate).getFullYear() : null

  const headerBg = node.gender === 'MALE'
    ? 'bg-sky-50 border-sky-100'
    : node.gender === 'FEMALE'
      ? 'bg-rose-50 border-rose-100'
      : 'bg-stone-50 border-stone-100'

  return (
    <>
      {/* Image cropper overlay */}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9997] bg-black/90 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-end px-4 py-3 shrink-0">
            {canEditPhotos && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(lightbox.id) }}
                disabled={deleteMutation.isPending}
                className="text-red-400 hover:text-red-300 text-sm font-semibold disabled:opacity-40"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(lightbox.url)}
              alt={lightbox.caption ?? 'Memory photo'}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain rounded-xl cursor-default"
            />
          </div>
          {lightbox.caption && (
            <p className="text-white/70 text-sm text-center px-6 pb-6 shrink-0">
              {lightbox.caption}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col bg-stone-50 overflow-y-auto">

        {/* Header */}
        <div className={cn('border-b px-4 pt-10 pb-6', headerBg)}>
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 mb-4 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex items-end gap-4">
            <Avatar src={node.avatarUrl} name={node.displayName} size="xl" />
            <div className="pb-1 min-w-0">
              <h1 className={cn(FONT.HEADING_LG, 'font-bold text-slate-800 leading-tight truncate')}>
                {node.displayName.length > MAX_CHARS.DISPLAY_NAME
                  ? `${node.displayName.slice(0, MAX_CHARS.DISPLAY_NAME)}…`
                  : node.displayName}
              </h1>
              {node.surname && (
                <p className={cn(FONT.LABEL, 'text-slate-500 font-medium mt-0.5')}>{node.surname}</p>
              )}
              {(birthYear ?? deathYear) && (
                <p className={cn(FONT.BODY, 'text-slate-400 mt-1')}>
                  {birthYear}
                  {node.isDeceased && deathYear ? ` – ${deathYear}` : ''}
                  {node.isDeceased && !deathYear ? ' (deceased)' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">

          {/* Details */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-50">
            {node.birthPlace && (
              <ProfileRow label="Birth place" value={node.birthPlace} />
            )}
            {node.birthDate && (
              <ProfileRow
                label="Date of birth"
                value={new Date(node.birthDate).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              />
            )}
            {node.deathDate && (
              <ProfileRow
                label="Date of death"
                value={new Date(node.deathDate).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              />
            )}
            {node.nik && <ProfileRow label="NIK" value={node.nik} />}
            {node.gender && (
              <ProfileRow label="Gender" value={node.gender === 'MALE' ? 'Male' : 'Female'} />
            )}
          </div>

          {/* Bio */}
          {node.bio && (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">About</p>
              <p className={cn(FONT.BODY, 'text-slate-700 leading-relaxed')}>{node.bio}</p>
            </div>
          )}

          {/* Memory Photos */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Memories{photos.length > 0 ? ` · ${photos.length}` : ''}
              </p>
              {canEditPhotos && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-40 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  {uploadMutation.isPending ? 'Uploading…' : 'Add photo'}
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoFilePick}
                className="hidden"
              />
            </div>

            {photos.length === 0 ? (
              canEditPhotos ? (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 text-slate-300 hover:text-slate-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18M6.75 6.75h.008v.008H6.75V6.75Z" />
                  </svg>
                  <p className="text-sm">Add your first memory photo</p>
                </button>
              ) : (
                <div className="w-full flex flex-col items-center justify-center gap-2 py-8 text-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18M6.75 6.75h.008v.008H6.75V6.75Z" />
                  </svg>
                  <p className="text-sm">No memories yet</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-3 gap-0.5 p-0.5">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setLightbox(photo)}
                    className="aspect-square overflow-hidden bg-stone-100 hover:opacity-90 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveUrl(photo.url)}
                      alt={photo.caption ?? 'Memory'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
                {/* Add tile — only for owners */}
                {canEditPhotos && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    className="aspect-square flex items-center justify-center bg-stone-50 hover:bg-stone-100 text-slate-300 hover:text-slate-400 transition-colors disabled:opacity-40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => router.push(`/profile/${node.id}/edit`)}
          >
            Edit Profile
          </Button>
        </div>
      </div>
    </>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <span className={cn(FONT.LABEL, 'text-slate-400 shrink-0')}>{label}</span>
      <span className={cn(FONT.LABEL, 'text-slate-700 text-right truncate')}>{value}</span>
    </div>
  )
}
