'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { CreateFamilyWithParentsSchema, type CreateFamilyWithParentsDto } from '@genyra/shared-types'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/map-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default function SetupPage() {
  const router = useRouter()
  const { setFamilyGroupId } = useAuthStore()
  const [noPartner, setNoPartner] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<CreateFamilyWithParentsDto>({
    resolver: zodResolver(CreateFamilyWithParentsSchema),
    defaultValues: { userIsParent: 'FATHER' },
  })

  const userIsParent = watch('userIsParent')

  const createMutation = useMutation({
    mutationFn: apiClient.createFamilyWithParents,
    onSuccess: (group) => {
      setFamilyGroupId(group.id)
      router.push('/map')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message ?? 'Failed to create family'
      setError('root', { message })
    },
  })

  const onSubmit = handleSubmit((data) => {
    const payload = noPartner
      ? { ...data, otherParentName: data.userIsParent === 'FATHER' ? 'Ibu' : 'Ayah', otherParentSurname: undefined }
      : data
    createMutation.mutate(payload)
  })

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-brand-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/genyra_logo.png"
            alt="Genyra"
            className="h-20 w-20 mx-auto mb-4"
          />
          <h1 className={cn(FONT.HEADING_LG, 'font-semibold text-slate-800')}>Create your family tree</h1>
          <p className={cn(FONT.BODY, 'text-slate-500 mt-1')}>
            Set up your family tree. Add your partner now or later.
          </p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          {/* Family name */}
          <Input
            id="familyName"
            label="Family Name"
            placeholder="e.g. Keluarga Santoso"
            maxLength={MAX_CHARS.GROUP_NAME}
            {...register('familyName')}
            error={errors.familyName?.message ?? undefined}
          />

          {/* Are you the father or mother? */}
          <div className="flex flex-col gap-1.5">
            <label className={cn(FONT.LABEL, 'font-medium text-slate-700')}>
              You are the…
            </label>
            <div className="flex gap-4">
              {(['FATHER', 'MOTHER'] as const).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    value={role}
                    {...register('userIsParent')}
                    className="accent-brand-500"
                  />
                  <span className={cn(FONT.BODY, 'text-slate-700')}>
                    {role === 'FATHER' ? '👨 Father' : '👩 Mother'}
                  </span>
                </label>
              ))}
            </div>
            {errors.userIsParent && (
              <p className="text-xs text-red-500">{errors.userIsParent.message}</p>
            )}
          </div>

          {/* No partner toggle */}
          <div className="flex items-center justify-between py-1">
            <span className={cn(FONT.BODY, 'text-slate-700')}>No partner yet</span>
            <button
              type="button"
              role="switch"
              aria-checked={noPartner}
              onClick={() => setNoPartner((v) => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                noPartner ? 'bg-brand-500' : 'bg-stone-200',
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                noPartner ? 'translate-x-6' : 'translate-x-1',
              )} />
            </button>
          </div>

          {/* Other parent */}
          {!noPartner && (
            <>
              <Input
                id="otherParentName"
                label={userIsParent === 'FATHER' ? "Mother's Full Name" : "Father's Full Name"}
                placeholder={userIsParent === 'FATHER' ? 'Sri Mulyani' : 'Ahmad Santoso'}
                maxLength={MAX_CHARS.DISPLAY_NAME}
                {...register('otherParentName')}
                error={errors.otherParentName?.message ?? undefined}
              />

              <Input
                id="otherParentSurname"
                label={`${userIsParent === 'FATHER' ? "Mother's" : "Father's"} Surname (optional)`}
                placeholder="Mulyani"
                {...register('otherParentSurname')}
                error={errors.otherParentSurname?.message ?? undefined}
              />
            </>
          )}

          {errors.root && (
            <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating family…' : 'Create my family tree'}
          </Button>

          <p className={cn(FONT.BODY, 'text-center text-slate-500')}>
            Joining an existing family instead?{' '}
            <a href="/join" className="text-brand-600 font-medium hover:underline">
              Use an invite code
            </a>
          </p>
        </form>
      </div>
    </main>
  )
}
