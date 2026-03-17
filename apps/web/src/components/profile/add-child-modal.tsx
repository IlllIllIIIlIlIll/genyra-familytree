'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useToastStore } from '@/store/map-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const Schema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100),
  gender:      z.enum(['MALE', 'FEMALE']).optional(),
  birthDate:   z.string().optional(),
})
type FormValues = z.infer<typeof Schema>

interface Props {
  onClose: () => void
}

export function AddChildModal({ onClose }: Props) {
  const toast         = useToastStore((s) => s.toast)
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const queryClient   = useQueryClient()

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const dto: { displayName: string; gender?: string; birthDate?: string } = {
        displayName: values.displayName,
      }
      if (values.gender !== undefined) dto.gender = values.gender
      if (values.birthDate) dto.birthDate = values.birthDate
      return apiClient.addChild(dto)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      toast('Child added — awaiting family head approval', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add child'
      toast(msg, 'error')
    },
  })

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-800">Add newborn child</h2>
        <p className="text-xs text-slate-400">A family head will need to approve this before it appears on the map.</p>

        <form onSubmit={(e) => void handleSubmit((v) => mutation.mutate(v))(e)} className="space-y-4">
          <Input
            id="displayName"
            label="Child's name"
            placeholder="Full name"
            {...register('displayName')}
            error={errors.displayName?.message}
          />

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
                          ? g === 'MALE' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-rose-50 border-rose-300 text-rose-700'
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

          <Input
            id="birthDate"
            type="date"
            label="Date of birth (optional)"
            {...register('birthDate')}
            error={errors.birthDate?.message}
          />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add child'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
