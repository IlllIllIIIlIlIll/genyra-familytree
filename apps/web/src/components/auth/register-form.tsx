'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { RegisterSchema, type RegisterDto } from '@genyra/shared-types'
import { apiClient } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'

export function RegisterForm() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterDto>({ resolver: zodResolver(RegisterSchema) })

  const registerMutation = useMutation({
    mutationFn: apiClient.register,
    onSuccess: () => router.push('/login'),
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message ?? 'Registration failed'
      setError('root', { message })
    },
  })

  const onSubmit = handleSubmit((data) => registerMutation.mutate(data))

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      {/* Full name */}
      <Input
        id="displayName"
        label="Full Name"
        placeholder="Budi Santoso"
        autoComplete="name"
        maxLength={MAX_CHARS.DISPLAY_NAME}
        {...register('displayName')}
        error={errors.displayName?.message ?? undefined}
      />

      {/* Gender */}
      <div className="flex flex-col gap-1.5">
        <label className={cn(FONT.LABEL, 'font-medium text-slate-700')}>Gender</label>
        <div className="flex gap-3">
          {(['MALE', 'FEMALE'] as const).map((g) => (
            <label
              key={g}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="radio"
                value={g}
                {...register('gender')}
                className="accent-brand-500"
              />
              <span className={cn(FONT.BODY, 'text-slate-700')}>
                {g === 'MALE' ? 'Male' : 'Female'}
              </span>
            </label>
          ))}
        </div>
        {errors.gender && (
          <p className="text-xs text-red-500">{errors.gender.message}</p>
        )}
      </div>

      {/* Surname */}
      <Input
        id="surname"
        label="Surname / Family Name"
        placeholder="Santoso"
        autoComplete="family-name"
        maxLength={MAX_CHARS.SURNAME}
        {...register('surname')}
        error={errors.surname?.message ?? undefined}
      />

      {/* NIK */}
      <Input
        id="nik"
        label="NIK (16 digits)"
        placeholder="3276011009040006"
        maxLength={16}
        inputMode="numeric"
        {...register('nik')}
        error={errors.nik?.message ?? undefined}
      />

      {/* Birth date */}
      <Input
        id="birthDate"
        type="date"
        label="Date of Birth"
        {...register('birthDate')}
        error={errors.birthDate?.message ?? undefined}
      />

      {/* Birth place */}
      <Input
        id="birthPlace"
        label="Place of Birth"
        placeholder="Jakarta"
        maxLength={MAX_CHARS.BIRTH_PLACE}
        {...register('birthPlace')}
        error={errors.birthPlace?.message ?? undefined}
      />

      {/* Password */}
      <Input
        id="password"
        type="password"
        label="Password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        {...register('password')}
        error={errors.password?.message ?? undefined}
      />

      {errors.root && (
        <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
