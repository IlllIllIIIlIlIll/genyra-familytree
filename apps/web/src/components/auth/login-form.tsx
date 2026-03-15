'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { LoginSchema, type LoginDto } from '@genyra/shared-types'
import { apiClient } from '@/lib/api-client'
import { saveTokens } from '@/lib/auth'
import { useAuthStore } from '@/store/map-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const router = useRouter()
  const { setTokens, setUser } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginDto>({ resolver: zodResolver(LoginSchema) })

  const loginMutation = useMutation({
    mutationFn: async (dto: LoginDto) => {
      const tokens = await apiClient.login(dto)
      // Save tokens to localStorage for the apiClient interceptor
      saveTokens(tokens.accessToken, tokens.refreshToken)
      
      // Fetch user info using the new tokens
      const user = await apiClient.getMe()
      
      return { tokens, user }
    },
    onSuccess: ({ tokens, user }) => {
      setTokens(tokens)
      setUser({
        userId: user.id,
        familyGroupId: user.familyGroupId,
        role: user.role,
      })
      
      if (!user.familyGroupId) {
        router.push('/setup')
      } else {
        router.push('/map')
      }
    },
    onError: (error: unknown) => {
      console.error('Login error:', error)
      setError('root', { message: 'Invalid NIK or password' })
    },
  })

  const onSubmit = handleSubmit((data) => loginMutation.mutate(data))

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="space-y-4"
    >
      <Input
        id="nik"
        label="NIK (16 digits)"
        placeholder="3276011009040006"
        inputMode="numeric"
        maxLength={16}
        {...register('nik')}
        error={errors.nik?.message}
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
