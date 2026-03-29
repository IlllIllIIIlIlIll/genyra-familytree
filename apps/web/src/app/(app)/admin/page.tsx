'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const router        = useRouter()
  const [copied, setCopied]                   = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletePassword, setDeletePassword]   = useState('')
  const [editNikId, setEditNikId]             = useState<string | null>(null)
  const [nikDraft, setNikDraft]               = useState('')
  const [transferOpen, setTransferOpen]       = useState(false)
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null)
  const [confirmDeleteFamily, setConfirmDeleteFamily] = useState(false)

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
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      apiClient.deleteUser(userId, password),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      void queryClient.invalidateQueries({ queryKey: ['admin-badge'] })
      setConfirmDeleteId(null)
      setDeletePassword('')
      toast('Member removed from the family tree', 'neutral')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to remove member'
      toast(msg, 'error')
    },
  })

  const handleDeleteClick = useCallback((id: string) => {
    setDeletePassword('')
    setConfirmDeleteId((prev) => (prev === id ? null : id))
  }, [])

  // ── Transfer ownership ─────────────────────────────────────────────────────
  const transferMutation = useMutation({
    mutationFn: (newHeadUserId: string) => apiClient.transferOwnership(familyGroupId!, newHeadUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyGroupId] })
      setTransferOpen(false)
      setTransferTargetId(null)
      toast('Ownership transferred. You are now a regular member.', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Transfer failed'
      toast(msg, 'error')
    },
  })

  // ── Delete family ──────────────────────────────────────────────────────────
  const deleteFamilyMutation = useMutation({
    mutationFn: () => apiClient.deleteFamily(familyGroupId!),
    onSuccess: () => {
      toast('Family deleted', 'neutral')
      useAuthStore.getState().clear()
      router.replace('/login')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete family'
      toast(msg, 'error')
      setConfirmDeleteFamily(false)
    },
  })

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
      <header className="bg-white border-b border-stone-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-slate-800">Admin Panel</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/members"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-stone-50 hover:bg-stone-100 text-slate-600 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
            </svg>
            Members
          </Link>
          <Link
            href="/stats"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-stone-50 hover:bg-stone-100 text-slate-600 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13a1.5 1.5 0 0 0 3 0v-13A1.5 1.5 0 0 0 15.5 2ZM9.5 6A1.5 1.5 0 0 0 8 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 9.5 6ZM3.5 10A1.5 1.5 0 0 0 2 11.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 3.5 10Z" />
            </svg>
            Stats
          </Link>
        </div>
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
                    {confirmDeleteId !== member.id && (
                      <button
                        onClick={() => handleDeleteClick(member.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {confirmDeleteId === member.id && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-red-500">
                        Enter <strong>your own</strong> password to confirm removing <strong>{member.displayName}</strong>. This cannot be undone.
                      </p>
                      <input
                        autoFocus
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                        className="text-xs bg-stone-100 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-red-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteMutation.mutate({ userId: member.id, password: deletePassword })}
                          disabled={!deletePassword || deleteMutation.isPending}
                          className="flex-1 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? 'Removing…' : 'Confirm Remove'}
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(null); setDeletePassword('') }}
                          className="flex-1 py-1.5 text-xs font-medium bg-stone-100 text-slate-600 rounded-lg hover:bg-stone-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Transfer ownership ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Transfer Ownership</p>
          <p className="text-xs text-slate-400 mb-3">
            Hand the Family Head role to another active member. You will become a regular member.
          </p>
          {!transferOpen ? (
            <button
              onClick={() => setTransferOpen(true)}
              className="w-full py-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
            >
              Transfer ownership…
            </button>
          ) : (
            <div className="space-y-3">
              <select
                value={transferTargetId ?? ''}
                onChange={(e) => setTransferTargetId(e.target.value || null)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="" disabled>Select new Family Head…</option>
                {members.map((m: User) => (
                  <option key={m.id} value={m.id}>{m.displayName}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => transferTargetId && transferMutation.mutate(transferTargetId)}
                  disabled={!transferTargetId || transferMutation.isPending}
                  className="flex-1 py-2 text-xs font-medium bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {transferMutation.isPending ? 'Transferring…' : 'Confirm Transfer'}
                </button>
                <button
                  onClick={() => { setTransferOpen(false); setTransferTargetId(null) }}
                  className="flex-1 py-2 text-xs font-medium bg-stone-100 text-slate-600 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Danger zone ───────────────────────────────────────────────────── */}
        {members.length === 0 && (
          <div className="bg-white rounded-2xl border border-red-100 p-5">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Danger Zone</p>
            <p className="text-xs text-slate-400 mb-3">
              You are the only member remaining. You can permanently delete this family.
            </p>
            {!confirmDeleteFamily ? (
              <button
                onClick={() => setConfirmDeleteFamily(true)}
                className="w-full py-2 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                Delete family…
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-500 font-medium">This will permanently delete the family and all its data. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteFamilyMutation.mutate()}
                    disabled={deleteFamilyMutation.isPending}
                    className="flex-1 py-2 text-xs font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {deleteFamilyMutation.isPending ? 'Deleting…' : 'Delete Forever'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteFamily(false)}
                    className="flex-1 py-2 text-xs font-medium bg-stone-100 text-slate-600 rounded-xl hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
