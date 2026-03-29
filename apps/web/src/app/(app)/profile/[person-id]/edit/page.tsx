'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useToastStore } from '@/store/map-store'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CityCombobox } from '@/components/ui/city-combobox'
import { ImageCropper } from '@/components/ui/image-cropper'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

// ── Zod schema for the edit form ──────────────────────────────────────────────

const EditSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(MAX_CHARS.DISPLAY_NAME, `Max ${MAX_CHARS.DISPLAY_NAME} characters`),
  surname:     z.string().max(MAX_CHARS.SURNAME, `Max ${MAX_CHARS.SURNAME} characters`).optional(),
  gender:      z.enum(['MALE', 'FEMALE']).optional(),
  birthDate:   z.string().optional(),   // date input: YYYY-MM-DD
  deathDate:   z.string().optional(),
  birthPlace:  z.string().max(MAX_CHARS.BIRTH_PLACE, `Max ${MAX_CHARS.BIRTH_PLACE} characters`).optional(),
  bio:         z.string().max(MAX_CHARS.BIO, `Max ${MAX_CHARS.BIO} characters`).optional(),
  isDeceased:  z.boolean().optional(),
})

type EditFormValues = z.infer<typeof EditSchema>

// ── Helper: convert ISO datetime → YYYY-MM-DD for <input type="date"> ────────
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10) // "2001-04-15T00:00:00.000Z" → "2001-04-15"
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const params        = useParams()
  const router        = useRouter()
  const personId      = params['person-id'] as string
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const authUserId    = useAuthStore((s) => s.userId)
  const role          = useAuthStore((s) => s.role)
  const toast         = useToastStore((s) => s.toast)
  const queryClient   = useQueryClient()

  const fileInputRef   = useRef<HTMLInputElement>(null)
  const [pendingAvatar, setPendingAvatar]   = useState<string | null>(null) // data URL
  const [cropFile,      setCropFile]        = useState<File | null>(null)

  const { data: mapData, isLoading } = useQuery({
    queryKey:  ['map-data', familyGroupId],
    queryFn:   () => apiClient.getMapData(familyGroupId!),
    enabled:   !!familyGroupId,
  })

  const node = mapData?.nodes.find((n) => n.id === personId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(EditSchema),
    mode: 'onBlur',
  })

  // Populate form once node data is available
  useEffect(() => {
    if (!node) return
    reset({
      displayName: node.displayName,
      surname:     node.surname ?? '',
      gender:      (node.gender as 'MALE' | 'FEMALE' | undefined) ?? undefined,
      birthDate:   toDateInput(node.birthDate),
      deathDate:   toDateInput(node.deathDate),
      birthPlace:  node.birthPlace ?? '',
      bio:         node.bio ?? '',
      isDeceased:  node.isDeceased,
    })
  }, [node, reset])

  const updateMutation = useMutation({
    mutationFn: async (values: EditFormValues) => {
      await apiClient.updatePersonNode(personId, {
        displayName: values.displayName,
        surname:     values.surname || null,
        gender:      values.gender ?? null,
        birthDate:   values.birthDate ? new Date(values.birthDate).toISOString() : null,
        deathDate:   values.deathDate ? new Date(values.deathDate).toISOString() : null,
        birthPlace:  values.birthPlace || null,
        bio:         values.bio || null,
        isDeceased:  values.isDeceased ?? false,
        // data URL stored directly in DB — only include when a new avatar was cropped
        ...(pendingAvatar !== null && { avatarUrl: pendingAvatar }),
      })
    },
    // M-06: optimistic update — patch the cached map-data immediately
    onMutate: async (values) => {
      const queryKey = ['map-data', familyGroupId]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: { nodes: { id: string }[]; edges: unknown[]; familyName: string } | undefined) => {
        if (!old) return old
        return {
          ...old,
          nodes: old.nodes.map((n) =>
            n.id !== personId ? n : {
              ...n,
              displayName: values.displayName,
              surname:     values.surname || null,
              gender:      values.gender ?? null,
              birthDate:   values.birthDate ? new Date(values.birthDate).toISOString() : null,
              deathDate:   values.deathDate ? new Date(values.deathDate).toISOString() : null,
              birthPlace:  values.birthPlace || null,
              bio:         values.bio || null,
              isDeceased:  values.isDeceased ?? false,
              ...(pendingAvatar !== null && { avatarUrl: pendingAvatar }),
            },
          ),
        }
      })
      return { previous, queryKey }
    },
    onError: (err, _values, context) => {
      // Rollback on error
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Failed to save profile'
      toast(msg, 'error')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      toast('Profile updated', 'success')
      router.back()
    },
  })

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      toast('Image must be under 20 MB', 'error')
      return
    }
    // Reset input so same file can be re-selected
    e.target.value = ''
    setCropFile(file)
  }

  const handleCropConfirm = useCallback((dataUrl: string) => {
    setPendingAvatar(dataUrl)
    setCropFile(null)
  }, [])

  const handleCropCancel = useCallback(() => setCropFile(null), [])

  const isDeceased = watch('isDeceased')

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

  const canEdit = node.userId === authUserId || role === 'FAMILY_HEAD'

  if (!canEdit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-stone-50 p-8 text-center">
        <p className={cn(FONT.HEADING_SM, 'font-semibold text-slate-400')}>Not your profile</p>
        <p className={cn(FONT.BODY, 'text-slate-300 max-w-xs')}>
          You can only edit your own profile.
        </p>
        <Button variant="secondary" onClick={() => router.back()} className="mt-2">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <>
    {cropFile && (
      <ImageCropper
        file={cropFile}
        defaultAspect={1}
        maxOutputPx={400}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    )}
    <div className="flex-1 flex flex-col bg-stone-50 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-stone-100 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className={cn(FONT.HEADING_SM, 'font-semibold text-slate-700 flex-1')}>Edit Profile</h1>
        <Button
          size="sm"
          variant="primary"
          type="submit"
          form="edit-profile-form"
          disabled={(!isDirty && !pendingAvatar) || isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Form */}
      <form
        id="edit-profile-form"
        onSubmit={handleSubmit((v) => updateMutation.mutate(v))}
        className="p-4 space-y-4 max-w-2xl mx-auto w-full pb-10"
      >

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
          >
            <Avatar
              src={pendingAvatar ?? node.avatarUrl}
              name={node.displayName}
              size="xl"
            />
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </button>
          <p className="text-xs text-slate-400">Tap to change photo</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarPick}
            className="hidden"
          />
        </div>

        {/* Personal Info */}
        <Section title="Personal Info">
          <Input
            id="displayName"
            label="Full name"
            placeholder="Full name"
            error={errors.displayName?.message}
            {...register('displayName')}
          />
          <Input
            id="surname"
            label="Nickname / panggilan"
            placeholder="e.g. Vian"
            error={errors.surname?.message}
            maxLength={MAX_CHARS.SURNAME}
            {...register('surname')}
          />

          {/* Gender */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Gender</label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  {(['MALE', 'FEMALE'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => field.onChange(field.value === g ? undefined : g)}
                      className={cn(
                        'flex-1 py-2 rounded-xl border text-sm font-medium transition-colors',
                        field.value === g
                          ? g === 'MALE'
                            ? 'bg-sky-50 border-sky-300 text-sky-700'
                            : 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-white border-stone-200 text-slate-500 hover:bg-stone-50',
                      )}
                    >
                      {g === 'MALE' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
        </Section>

        {/* Dates */}
        <Section title="Dates">
          <Input
            id="birthDate"
            label="Date of birth"
            type="date"
            error={errors.birthDate?.message}
            {...register('birthDate')}
          />

          {/* Deceased toggle */}
          <div className="flex items-center justify-between py-1">
            <label htmlFor="isDeceased" className="text-sm font-medium text-slate-700">
              Deceased
            </label>
            <Controller
              name="isDeceased"
              control={control}
              render={({ field }) => (
                <button
                  id="isDeceased"
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    field.value ? 'bg-slate-500' : 'bg-stone-200',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                      field.value ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              )}
            />
          </div>

          {isDeceased && (
            <Input
              id="deathDate"
              label="Date of death"
              type="date"
              error={errors.deathDate?.message}
              {...register('deathDate')}
            />
          )}
        </Section>

        {/* Location */}
        <Section title="Location">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Birth place</label>
            <Controller
              name="birthPlace"
              control={control}
              render={({ field }) => (
                <CityCombobox
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Search city…"
                />
              )}
            />
            {errors.birthPlace && (
              <p className="text-xs text-red-500">{errors.birthPlace.message}</p>
            )}
          </div>
        </Section>

        {/* Biography */}
        <Section title="About">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-slate-700">Bio</label>
            <textarea
              id="bio"
              rows={4}
              maxLength={MAX_CHARS.BIO}
              placeholder="Write something about this person…"
              className={cn(
                'w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white resize-none',
                'border-slate-200 placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                errors.bio && 'border-red-400',
              )}
              {...register('bio')}
            />
            {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
          </div>
        </Section>

      </form>
    </div>
    </>
  )
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
        {title}
      </p>
      <div className="p-4 pt-2 flex flex-col gap-3">
        {children}
      </div>
    </div>
  )
}
