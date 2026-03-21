'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useToastStore } from '@/store/map-store'
import { cn } from '@/lib/utils'
import type { User, PersonNode, LeaveRequest } from '@genyra/shared-types'

const RELATIONSHIP_LABELS: Record<string, string> = {
  REFERRER_IS_FATHER:   'referred by their father',
  REFERRER_IS_SON:      'referred by their son',
  REFERRER_IS_DAUGHTER: 'referred by their daughter',
  REFERRER_IS_SPOUSE:   'referred by their spouse',
  REFERRER_IS_SIBLING:  'referred by their sibling',
}

export default function AdminPage() {
  const familyGroupId = useAuthStore((s) => s.familyGroupId)
  const toast         = useToastStore((s) => s.toast)
  const queryClient   = useQueryClient()
  const [copied, setCopied]             = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editNikId, setEditNikId]       = useState<string | null>(null)
  const [nikDraft, setNikDraft]         = useState('')

  // ── Invite ─────────────────────────────────────────────────────────────────
  const { data: invite, isLoading: loadingInvite } = useQuery({
    queryKey: ['family-invite'],
    queryFn:  () => apiClient.getFamilyInvite(),
  })

  const refreshMutation = useMutation({
    mutationFn: () => apiClient.refreshFamilyInvite(),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['family-invite'] })
      toast('Invite code refreshed', 'success')
    },
    onError: () => toast('Failed to refresh invite', 'error'),
  })

  const handleCopy = () => {
    if (!invite) return
    void navigator.clipboard.writeText(invite.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inviteExpiry = invite
    ? invite.status === 'USED'
      ? 'Used'
      : new Date(invite.expiresAt) < new Date()
        ? 'Expired'
        : `Expires ${new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : null

  const isInviteActive = invite && invite.status === 'UNUSED' && new Date(invite.expiresAt) >= new Date()

  // ── Pending members ────────────────────────────────────────────────────────
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

  // ── Pending child nodes ────────────────────────────────────────────────────
  const { data: pendingNodes = [], isLoading: loadingNodes } = useQuery({
    queryKey: ['pending-nodes'],
    queryFn:  () => apiClient.getPendingNodes(),
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

  const rejectNodeMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePersonNode(id),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['pending-nodes'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      toast('Request rejected', 'neutral')
    },
    onError: () => toast('Failed to reject', 'error'),
  })

  // ── Unlinked (corrupted) nodes ─────────────────────────────────────────────
  const { data: unlinkedNodes = [] } = useQuery({
    queryKey: ['unlinked-nodes'],
    queryFn:  () => apiClient.getUnlinkedNodes(),
  })

  const deleteUnlinkedMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePersonNode(id),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['unlinked-nodes'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      toast('Node removed', 'neutral')
    },
    onError: () => toast('Failed to remove', 'error'),
  })

  // ── All active members ─────────────────────────────────────────────────────
  const { data: members = [] } = useQuery({
    queryKey: ['family-members'],
    queryFn:  () => apiClient.getFamilyMembers(),
    enabled:  !!familyGroupId,
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => apiClient.deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      void queryClient.invalidateQueries({ queryKey: ['admin-badge'] })
      setConfirmDeleteId(null)
      toast('Member removed from the family tree', 'neutral')
    },
    onError: () => toast('Failed to remove member', 'error'),
  })

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmDeleteId((prev) => (prev === id ? null : id))
  }, [])

  // ── Leave requests ─────────────────────────────────────────────────────────
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests', familyGroupId],
    queryFn:  () => apiClient.getLeaveRequests(familyGroupId!),
    enabled:  !!familyGroupId,
  })

  const processLeaveMutation = useMutation({
    mutationFn: ({ requestId, approve }: { requestId: string; approve: boolean }) =>
      apiClient.processLeaveRequest(familyGroupId!, requestId, approve),
    onSuccess: (_, { approve }) => {
      void queryClient.invalidateQueries({ queryKey: ['leave-requests', familyGroupId] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
      toast(approve ? 'Member removed from family' : 'Leave request rejected', approve ? 'neutral' : 'neutral')
    },
    onError: () => toast('Failed to process request', 'error'),
  })

  // ── NIK edit ───────────────────────────────────────────────────────────────
  const updateNikMutation = useMutation({
    mutationFn: ({ userId, nik }: { userId: string; nik: string }) =>
      apiClient.adminUpdateNik(userId, nik),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
      setEditNikId(null)
      toast('NIK updated', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update NIK'
      toast(msg, 'error')
    },
  })

  const totalPending = pendingUsers.length + pendingNodes.length + leaveRequests.length
  const isLoading    = loadingUsers || loadingNodes

  return (
    <div className="min-h-screen bg-stone-50 pb-36">
      <header className="bg-white border-b border-stone-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-slate-800">Admin Panel</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-5">

        {/* ── Invite code card ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Family Invite Code</p>

          {loadingInvite ? (
            <div className="h-12 flex items-center justify-center">
              <div className="animate-spin h-5 w-5 rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          ) : invite ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={cn(
                    'font-mono text-3xl font-bold tracking-[0.25em] flex-1',
                    isInviteActive ? 'text-slate-800' : 'text-slate-300 line-through',
                  )}
                >
                  {invite.code}
                </span>
                <button
                  onClick={handleCopy}
                  disabled={!isInviteActive}
                  className="px-3 py-1.5 text-xs font-medium bg-stone-100 text-slate-600 rounded-lg hover:bg-stone-200 disabled:opacity-40 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-xs font-medium',
                  isInviteActive ? 'text-slate-400' : 'text-red-400',
                )}>
                  {inviteExpiry}
                </span>
                <button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 disabled:opacity-50 transition-colors"
                >
                  {refreshMutation.isPending ? 'Refreshing…' : 'Refresh code'}
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* ── Pending approvals ─────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Pending Approvals {totalPending > 0 ? `(${totalPending})` : ''}
          </p>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          ) : totalPending === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No pending approvals.</p>
          ) : (
            <ul className="space-y-3">
              {/* Pending members */}
              {pendingUsers.map((user: User) => (
                <li key={user.id} className="bg-white rounded-xl border border-stone-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{user.displayName}</p>
                      <p className="text-xs text-slate-400">NIK: {user.nik}</p>
                      {user.referrerNik && (
                        <p className="text-xs text-brand-600 mt-0.5">
                          NIK {user.referrerNik}
                          {user.referrerRelationship
                            ? ` — ${RELATIONSHIP_LABELS[user.referrerRelationship] ?? user.referrerRelationship}`
                            : ''}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                        className="px-3 py-1.5 text-xs font-medium bg-stone-100 text-slate-600 rounded-lg hover:bg-stone-200 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}

              {/* Leave requests */}
              {leaveRequests.map((req: LeaveRequest) => (
                <li key={req.id} className="bg-white rounded-xl border border-orange-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{req.displayName}</p>
                      <p className="text-xs text-slate-400">NIK: {req.nik}</p>
                      <p className="text-xs text-orange-500 mt-0.5">Requesting to leave the family</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => processLeaveMutation.mutate({ requestId: req.id, approve: true })}
                        disabled={processLeaveMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-stone-100 text-slate-600 rounded-lg hover:bg-stone-200 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => processLeaveMutation.mutate({ requestId: req.id, approve: false })}
                        disabled={processLeaveMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}

              {/* Pending child nodes */}
              {pendingNodes.map((node: PersonNode) => (
                <li key={node.id} className="bg-white rounded-xl border border-stone-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{node.displayName}</p>
                      <p className="text-xs text-slate-400">
                        {node.gender === 'MALE' ? 'Male' : node.gender === 'FEMALE' ? 'Female' : 'Gender unknown'}
                        {node.birthDate ? ` · ${new Date(node.birthDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                      </p>
                      {node.birthPlace && (
                        <p className="text-xs text-slate-400">{node.birthPlace}</p>
                      )}
                      <p className="text-xs text-brand-400 mt-0.5">Child addition request</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => approveNodeMutation.mutate(node.id)}
                        disabled={approveNodeMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectNodeMutation.mutate(node.id)}
                        disabled={rejectNodeMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-stone-100 text-slate-600 rounded-lg hover:bg-stone-200 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Unlinked nodes (no account — cleanup) ─────────────────────────── */}
        {unlinkedNodes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Unlinked Members ({unlinkedNodes.length})
            </p>
            <p className="text-xs text-slate-400 mb-3">
              These entries have no account linked — they may be corrupted or created by an older version. Remove and re-add them if needed.
            </p>
            <ul className="space-y-2">
              {unlinkedNodes.map((node: PersonNode) => (
                <li key={node.id} className="bg-white rounded-xl border border-amber-100 p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{node.displayName}</p>
                    <p className="text-xs text-slate-400">
                      {node.surname ? `"${node.surname}"` : <span className="text-amber-500">No nickname</span>}
                      {' · '}
                      {node.nik ?? <span className="text-amber-500">No NIK</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteUnlinkedMutation.mutate(node.id)}
                    disabled={deleteUnlinkedMutation.isPending}
                    className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Members (remove from tree) ────────────────────────────────────── */}
        {members.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Family Members ({members.length})
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Removing a member deletes their account and node from the tree permanently.
            </p>
            <ul className="space-y-2">
              {members.map((member: User) => (
                <li key={member.id} className="bg-white rounded-xl border border-stone-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{member.displayName}</p>
                      {editNikId === member.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            autoFocus
                            value={nikDraft}
                            onChange={(e) => setNikDraft(e.target.value.replace(/\D/g, '').slice(0, 16))}
                            placeholder="16-digit NIK"
                            inputMode="numeric"
                            maxLength={16}
                            className="text-xs bg-stone-100 rounded-lg px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-brand-400"
                          />
                          <button
                            onClick={() => updateNikMutation.mutate({ userId: member.id, nik: nikDraft })}
                            disabled={nikDraft.length !== 16 || updateNikMutation.isPending}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 px-1"
                          >Save</button>
                          <button onClick={() => setEditNikId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-1">✕</button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          NIK: {member.nik}
                          {member.role === 'FAMILY_HEAD' && (
                            <span className="ml-1 text-brand-500 font-medium">Family Head</span>
                          )}
                          <button
                            onClick={() => { setEditNikId(member.id); setNikDraft(member.nik) }}
                            className="ml-1 text-slate-300 hover:text-slate-500 transition-colors"
                            title="Edit NIK"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </p>
                      )}
                    </div>
                    {confirmDeleteId === member.id ? (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => deleteMutation.mutate(member.id)}
                          disabled={deleteMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? 'Removing…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 text-xs font-medium bg-stone-100 text-slate-600 rounded-lg hover:bg-stone-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteClick(member.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {confirmDeleteId === member.id && (
                    <p className="text-xs text-red-500 mt-2">
                      This will permanently delete {member.displayName} and all their data. This cannot be undone.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  )
}
