'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useToastStore } from '@/store/map-store'
import { cn } from '@/lib/utils'
import type { Invite } from '@genyra/shared-types'

type Tab = 'members' | 'children' | 'invites'

export default function ApprovalsPage() {
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const toast         = useToastStore((s) => s.toast)
  const queryClient   = useQueryClient()
  const [tab, setTab] = useState<Tab>('members')

  // ── Pending users ─────────────────────────────────────────────────────────
  const { data: pendingUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['pending-users', familyGroupId],
    queryFn:  () => apiClient.getPendingUsers(),
    enabled:  !!familyGroupId,
  })

  const approveMutation = useMutation({
    mutationFn: (userId: string) => apiClient.updateUserStatus(userId, 'ACTIVE'),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['pending-users'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      toast('Member approved', 'success')
    },
    onError: () => toast('Failed to approve', 'error'),
  })

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => apiClient.updateUserStatus(userId, 'DEACTIVATED'),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['pending-users'] })
      toast('Member rejected', 'neutral')
    },
    onError: () => toast('Failed to reject', 'error'),
  })

  // ── Pending person nodes ──────────────────────────────────────────────────
  const { data: pendingNodes = [], isLoading: loadingNodes } = useQuery({
    queryKey: ['pending-nodes'],
    queryFn:  () => apiClient.getPendingNodes(),
    enabled:  tab === 'children',
  })

  const approveNodeMutation = useMutation({
    mutationFn: (id: string) => apiClient.approvePersonNode(id),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['pending-nodes'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      toast('Child approved', 'success')
    },
    onError: () => toast('Failed to approve', 'error'),
  })

  // ── Invites ───────────────────────────────────────────────────────────────
  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['invites', familyGroupId],
    queryFn:  () => apiClient.listInvites(familyGroupId!),
    enabled:  !!familyGroupId && tab === 'invites',
  })

  const generateMutation = useMutation({
    mutationFn: () => apiClient.generateInvite(),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['invites', familyGroupId] })
      toast('New invite code generated', 'success')
    },
    onError: () => toast('Failed to generate invite', 'error'),
  })

  const refreshMutation = useMutation({
    mutationFn: (id: string) => apiClient.refreshInvite(id),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['invites', familyGroupId] })
      toast('Invite code refreshed', 'success')
    },
    onError: () => toast('Failed to refresh', 'error'),
  })

  const tabCls = (t: Tab) => cn(
    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
    tab === t ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100',
  )

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Tab nav */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button className={tabCls('members')} onClick={() => setTab('members')}>
          Members {pendingUsers.length > 0 ? `(${pendingUsers.length})` : ''}
        </button>
        <button className={tabCls('children')} onClick={() => setTab('children')}>
          Children {pendingNodes.length > 0 ? `(${pendingNodes.length})` : ''}
        </button>
        <button className={tabCls('invites')} onClick={() => setTab('invites')}>Invites</button>
      </div>

      {/* ── Members tab ─────────────────────────────────────────────────── */}
      {tab === 'members' && (
        <>
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <p className="text-slate-400 text-sm">No pending member requests.</p>
          ) : (
            <ul className="space-y-3">
              {pendingUsers.map((user) => (
                <li key={user.id} className="bg-white rounded-xl border border-stone-100 p-4 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{user.displayName}</p>
                      <p className="text-xs text-slate-500">NIK: {user.nik}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Registered {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ── Children tab ────────────────────────────────────────────────── */}
      {tab === 'children' && (
        <>
          {loadingNodes ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          ) : pendingNodes.length === 0 ? (
            <p className="text-slate-400 text-sm">No pending child additions.</p>
          ) : (
            <ul className="space-y-3">
              {pendingNodes.map((node) => (
                <li key={node.id} className="bg-white rounded-xl border border-stone-100 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{node.displayName}</p>
                    {node.birthDate && (
                      <p className="text-xs text-slate-400">
                        Born {new Date(node.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">{node.gender ?? 'Gender unknown'}</p>
                  </div>
                  <button
                    onClick={() => approveNodeMutation.mutate(node.id)}
                    disabled={approveNodeMutation.isPending}
                    className="px-3 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 shrink-0"
                  >
                    Approve
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ── Invites tab ─────────────────────────────────────────────────── */}
      {tab === 'invites' && (
        <div className="space-y-4">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full py-2.5 rounded-xl border border-dashed border-brand-300 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating…' : '+ Generate new invite code'}
          </button>

          {loadingInvites ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-slate-400 text-sm">No invite codes yet.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((invite) => (
                <InviteRow
                  key={invite.id}
                  invite={invite}
                  onRefresh={() => refreshMutation.mutate(invite.id)}
                  refreshing={refreshMutation.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function InviteRow({ invite, onRefresh, refreshing }: { invite: Invite; onRefresh: () => void; refreshing: boolean }) {
  const isExpired = invite.status === 'EXPIRED' || new Date(invite.expiresAt) < new Date()
  const isUsed    = invite.status === 'USED'

  return (
    <li className="bg-white rounded-xl border border-stone-100 p-4 flex items-center justify-between gap-4">
      <div>
        <p className={cn('font-mono text-base font-semibold', isExpired || isUsed ? 'text-slate-400 line-through' : 'text-slate-800')}>
          {invite.code}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {isUsed ? 'Used' : isExpired ? 'Expired' : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 shrink-0"
      >
        Refresh
      </button>
    </li>
  )
}
