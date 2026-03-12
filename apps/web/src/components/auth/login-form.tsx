'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { LoginSchema, type LoginDto } from '@genyra/shared-types'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/map-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const router = useRouter()
  const { setTokens } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginDto>({ resolver: zodResolver(LoginSchema) })

  const loginMutation = useMutation({
    mutationFn: apiClient.login,
    onSuccess: (tokens) => {
      setTokens(tokens)
      router.push('/map')
    },
    onError: () => {
      setError('root', { message: 'Invalid email or password' })
    },
  })

  const onSubmit = handleSubmit((data) => loginMutation.mutate(data))

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
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
        placeholder="••••••••"
        autoComplete="current-password"
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
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
