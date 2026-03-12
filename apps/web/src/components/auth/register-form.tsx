'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { RegisterSchema, type RegisterDto } from '@genyra/shared-types'
import { apiClient } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
      <Input
        id="displayName"
        label="Full Name"
        placeholder="Jane Smith"
        autoComplete="name"
        {...register('displayName')}
        error={errors.displayName?.message}
      />
      <Input
        id="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        {...register('email')}
        error={errors.email?.message}
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
      {errors.root && (
        <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? 'Submitting…' : 'Register'}
      </Button>
    </form>
  )
}
