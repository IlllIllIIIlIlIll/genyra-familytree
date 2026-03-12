'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { JoinGroupSchema, type JoinGroupDto } from '@genyra/shared-types'
import { apiClient } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function JoinForm() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<JoinGroupDto>({ resolver: zodResolver(JoinGroupSchema) })

  const joinMutation = useMutation({
    mutationFn: apiClient.joinFamilyGroup,
    onSuccess: () => router.push('/pending-approval'),
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message ?? 'Failed to join group'
      setError('root', { message })
    },
  })

  const onSubmit = handleSubmit((data) => joinMutation.mutate(data))

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <Input
        id="inviteCode"
        label="Invite Code"
        placeholder="GEN-XXXX"
        autoComplete="off"
        {...register('inviteCode')}
        error={errors.inviteCode?.message ?? ''}
      />
      {errors.root && (
        <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={joinMutation.isPending}
      >
        {joinMutation.isPending ? 'Verifying…' : 'Join Family Group'}
      </Button>
    </form>
  )
}
