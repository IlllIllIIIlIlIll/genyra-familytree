'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useToastStore } from '@/store/map-store'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FONT } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { User } from '@genyra/shared-types'

export default function MembersPage() {
  const router        = useRouter()
  const role          = useAuthStore((s) => s.role)
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const currentUserId = useAuthStore((s) => s.userId)
  const toast         = useToastStore((s) => s.toast)
  const queryClient   = useQueryClient()
  const isFamilyHead  = role === 'FAMILY_HEAD'

  const [removing, setRemoving]         = useState<string | null>(null)
  const [headPassword, setHeadPassword] = useState('')
  const [confirmId, setConfirmId]       = useState<string | null>(null)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['family-members'],
    queryFn:  () => apiClient.getFamilyMembers(),
    enabled:  isFamilyHead && !!familyGroupId,
  })

  const removeMutation = useMutation({
    mutationFn: ({ userId, pw }: { userId: string; pw: string }) =>
      apiClient.deleteUser(userId, pw),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      toast('Member removed', 'success')
      setConfirmId(null)
      setHeadPassword('')
      setRemoving(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to remove member'
      toast(msg, 'error')
    },
  })

  const handleRemoveClick = (userId: string) => {
    setConfirmId(userId)
    setHeadPassword('')
  }

  const handleConfirmRemove = () => {
    if (!confirmId || !headPassword) return
    setRemoving(confirmId)
    removeMutation.mutate({ userId: confirmId, pw: headPassword })
  }

  if (!isFamilyHead) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50">
        <p className={cn(FONT.BODY, 'text-slate-400 text-center')}>
          Only the Family Head can view the members list.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-stone-50 overflow-y-auto pb-20">
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
        <h1 className={cn(FONT.HEADING_SM, 'font-semibold text-slate-700 flex-1')}>Members</h1>
        <span className={cn(FONT.LABEL, 'text-slate-400')}>{members.length} active</span>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className={cn(FONT.BODY, 'text-slate-400')}>No other active members.</p>
        </div>
      ) : (
        <ul className="p-4 space-y-2 max-w-2xl mx-auto w-full">
          {members.map((m: User) => (
            <li key={m.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-3">
              <Avatar name={m.displayName} size="md" />
              <div className="flex-1 min-w-0">
                <p className={cn(FONT.BODY, 'font-semibold text-slate-800 truncate')}>{m.displayName}</p>
                {m.surname && <p className={cn(FONT.LABEL, 'text-slate-400 truncate')}>{m.surname}</p>}
                <p className={cn(FONT.LABEL, 'text-slate-300 font-mono text-[10px]')}>{m.nik}</p>
              </div>
              <span className={cn(
                'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
                m.role === 'FAMILY_HEAD'
                  ? 'bg-brand-50 text-brand-600'
                  : 'bg-stone-100 text-slate-400',
              )}>
                {m.role === 'FAMILY_HEAD' ? 'Head' : 'Member'}
              </span>
              {isFamilyHead && m.id !== currentUserId && m.role !== 'FAMILY_HEAD' && (
                <button
                  onClick={() => handleRemoveClick(m.id)}
                  className="ml-1 p-1.5 rounded-full text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  title="Remove member"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Remove confirmation dialog */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className={cn(FONT.HEADING_SM, 'font-semibold text-slate-800')}>Remove member?</h2>
            <p className={cn(FONT.BODY, 'text-slate-500')}>
              This will soft-delete their profile and free up their NIK. Enter your password to confirm.
            </p>
            <input
              type="password"
              placeholder="Your password"
              value={headPassword}
              onChange={(e) => setHeadPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setConfirmId(null); setHeadPassword(''); setRemoving(null) }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-red-500 hover:bg-red-600"
                disabled={!headPassword || removeMutation.isPending}
                onClick={handleConfirmRemove}
              >
                {removeMutation.isPending && removing === confirmId ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
