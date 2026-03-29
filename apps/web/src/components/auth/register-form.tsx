'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { RegisterSchema, type RegisterDto, type ReferrerRelationship } from '@genyra/shared-types'
import { apiClient } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'

type Mode = 'join' | 'create'

const RELATIONSHIP_OPTIONS: { value: ReferrerRelationship; label: string }[] = [
  { value: 'REFERRER_IS_FATHER',   label: 'They are my father'  },
  { value: 'REFERRER_IS_SON',      label: 'They are my son'     },
  { value: 'REFERRER_IS_DAUGHTER', label: 'They are my daughter'},
  { value: 'REFERRER_IS_SPOUSE',   label: 'They are my spouse'  },
  { value: 'REFERRER_IS_SIBLING',  label: 'They are my sibling' },
]

interface Props {
  onSuccess?: (usedInvite: boolean) => void
}

export function RegisterForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('join')

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    setError,
    reset,
  } = useForm<RegisterDto>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { inviteCode: '', referrerNik: '', familyName: '' },
  })

  const referrerNikValue = watch('referrerNik')
  const showRelationship = mode === 'join' && (referrerNikValue?.length ?? 0) === 16

  const registerMutation = useMutation({
    mutationFn: apiClient.register,
    onSuccess: (_data, variables) => {
      onSuccess?.(!!variables.inviteCode)
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message ?? 'Registration failed'
      setError('root', { message })
    },
  })

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('root', { message: '' })
    reset(undefined, { keepValues: true })
  }

  const onSubmit = handleSubmit((data) => {
    const payload: RegisterDto =
      mode === 'join'
        ? { ...data, inviteCode: data.inviteCode, familyName: undefined }
        : { ...data, inviteCode: undefined, referrerNik: undefined, referrerRelationship: undefined, familyName: data.familyName }
    registerMutation.mutate(payload)
  })

  return (
    <div className="space-y-5">
      {/* Join / Create toggle */}
      <div className="flex rounded-xl border border-stone-200 overflow-hidden">
        {(['join', 'create'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors',
              mode === m ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-stone-50',
            )}
          >
            {m === 'join' ? 'Join family' : 'Start new family'}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">

        {/* Mode-specific fields */}
        {mode === 'join' ? (
          <>
            <Input
              id="inviteCode"
              label="Invite Code"
              placeholder="AJKLH"
              autoComplete="off"
              autoCapitalize="characters"
              {...register('inviteCode')}
              error={errors.inviteCode?.message}
            />
            <Input
              id="referrerNik"
              label="Referrer NIK"
              placeholder="3276011009040006"
              inputMode="numeric"
              maxLength={16}
              {...register('referrerNik')}
              error={errors.referrerNik?.message}
            />
            {showRelationship && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  What is your relationship to that person?
                </label>
                <Controller
                  name="referrerRelationship"
                  control={control}
                  render={({ field }) => (
                    <select
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                      className={cn(
                        'w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white',
                        'border-slate-200 text-slate-700',
                        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                        !field.value && 'text-slate-400',
                      )}
                    >
                      <option value="" disabled hidden>Select relationship…</option>
                      {RELATIONSHIP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.referrerRelationship && (
                  <p className="text-xs text-red-500">{errors.referrerRelationship.message}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <Input
            id="familyName"
            label="Family Name"
            placeholder="Keluarga Besar Sadikin"
            maxLength={100}
            {...register('familyName')}
            error={errors.familyName?.message}
          />
        )}

        {/* Divider */}
        <div className="border-t border-stone-100" />

        {/* Shared personal info */}
        <Input
          id="displayName"
          label="Full Name"
          placeholder="Budi Santoso"
          autoComplete="name"
          maxLength={MAX_CHARS.DISPLAY_NAME}
          {...register('displayName')}
          error={errors.displayName?.message}
        />

        <div className="flex flex-col gap-1.5">
          <label className={cn(FONT.LABEL, 'font-medium text-slate-700')}>Gender</label>
          <div className="flex gap-3">
            {(['MALE', 'FEMALE'] as const).map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="radio" value={g} {...register('gender')} className="accent-brand-500" />
                <span className={cn(FONT.BODY, 'text-slate-700')}>{g === 'MALE' ? 'Male' : 'Female'}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
        </div>

        <Input
          id="surname"
          label="Nickname"
          placeholder="e.g. Budi"
          autoComplete="off"
          maxLength={MAX_CHARS.SURNAME}
          {...register('surname')}
          error={errors.surname?.message}
        />

        <Input
          id="nik"
          label="NIK (16 digits)"
          placeholder="3276011009040006"
          maxLength={16}
          inputMode="numeric"
          {...register('nik')}
          error={errors.nik?.message}
        />

        <Input
          id="birthDate"
          type="date"
          label="Date of Birth"
          {...register('birthDate')}
          error={errors.birthDate?.message}
        />

        <Input
          id="birthPlace"
          label="Place of Birth"
          placeholder="Jakarta"
          maxLength={MAX_CHARS.BIRTH_PLACE}
          {...register('birthPlace')}
          error={errors.birthPlace?.message}
        />

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
        />

        {errors.root?.message && (
          <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={registerMutation.isPending}
        >
          {registerMutation.isPending
            ? 'Creating account…'
            : mode === 'join'
              ? 'Register & join family'
              : 'Create family & register'}
        </Button>
      </form>
    </div>
  )
}
