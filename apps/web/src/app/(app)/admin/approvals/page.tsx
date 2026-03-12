'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/map-store'

export default function ApprovalsPage() {
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const queryClient = useQueryClient()

  const { data: pendingUsers = [], isLoading } = useQuery({
    queryKey: ['pending-users', familyGroupId],
    queryFn: () => apiClient.getPendingUsers(),
    enabled: !!familyGroupId,
  })

  const approveMutation = useMutation({
    mutationFn: (userId: string) => apiClient.updateUserStatus(userId, 'ACTIVE'),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['pending-users'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => apiClient.updateUserStatus(userId, 'DEACTIVATED'),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['pending-users'] }),
  })

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">Pending Approvals</h1>
      {pendingUsers.length === 0 ? (
        <p className="text-slate-400 text-sm">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {pendingUsers.map((user) => (
            <li
              key={user.id}
              className="bg-white rounded-xl border border-brand-100 p-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium text-slate-800 text-sm">{user.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registered {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approveMutation.mutate(user.id)}
                  disabled={approveMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectMutation.mutate(user.id)}
                  disabled={rejectMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
