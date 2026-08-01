'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useToastStore } from '@/store/map-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FONT, MAX_CHARS } from '@/lib/design-tokens'
import type { LeaveRequest } from '@genyra/shared-types'

export default function AdminPage() {
  const setFamilyGroupId = useAuthStore((s) => s.setFamilyGroupId)

  const { data: family, isLoading, error } = useQuery({
    queryKey: ['admin-family'],
    queryFn:  () => apiClient.admin.getFamily(),
    retry: false,
  })

  const familyNotFound = axios.isAxiosError(error) && error.response?.status === 404

  useEffect(() => {
    if (family) setFamilyGroupId(family.id)
  }, [family, setFamilyGroupId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    )
  }

  if (familyNotFound || !family) {
    return <CreateFamilyForm />
  }

  return <AdminDashboard familyId={family.id} familyName={family.name} />
}

// ── Onboarding: create the admin's one family ────────────────────────────────

function CreateFamilyForm() {
  const toast        = useToastStore((s) => s.toast)
  const queryClient  = useQueryClient()
  const setFamilyGroupId = useAuthStore((s) => s.setFamilyGroupId)
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')

  const createMutation = useMutation({
    mutationFn: () => apiClient.admin.createFamily({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (group) => {
      setFamilyGroupId(group.id)
      void queryClient.invalidateQueries({ queryKey: ['admin-family'] })
      toast('Family created', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create family'
      toast(msg, 'error')
    },
  })

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-brand-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/genyra_logo.png" alt="Genyra" className="h-20 w-20 mx-auto mb-4" />
          <h1 className={cn(FONT.HEADING_LG, 'font-semibold text-slate-800')}>Create your family tree</h1>
          <p className={cn(FONT.BODY, 'text-slate-500 mt-1')}>
            As the admin, you&apos;ll manage members, relationships, and access for this family.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}
          className="space-y-5 bg-white rounded-2xl border border-stone-100 shadow-sm p-6"
        >
          <Input
            id="familyName"
            label="Family Name"
            placeholder="e.g. Keluarga Besar Santoso"
            maxLength={MAX_CHARS.GROUP_NAME}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="familyDescription" className="text-sm font-medium text-slate-700">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="familyDescription"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note about this family…"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white resize-none placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={createMutation.isPending}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating…' : 'Create my family'}
          </Button>
        </form>
      </div>
    </main>
  )
}

// ── Dashboard: shown once the admin's family exists ──────────────────────────

function AdminDashboard({ familyId, familyName }: { familyId: string; familyName: string }) {
  const toast        = useToastStore((s) => s.toast)
  const queryClient  = useQueryClient()
  const router       = useRouter()

  const [isEditingName, setIsEditingName]             = useState(false)
  const [nameDraft, setNameDraft]                     = useState(familyName)
  const [confirmDeleteFamily, setConfirmDeleteFamily] = useState(false)

  const { data: members = [] } = useQuery({
    queryKey: ['admin-members'],
    queryFn:  () => apiClient.admin.listMembers(),
  })

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['admin-leave-requests'],
    queryFn:  () => apiClient.admin.getLeaveRequests(),
  })

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => apiClient.admin.updateFamily(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-family'] })
      setIsEditingName(false)
      toast('Family name updated', 'success')
    },
    onError: () => toast('Failed to update family name', 'error'),
  })

  const processLeaveMutation = useMutation({
    mutationFn: ({ requestId, approve }: { requestId: string; approve: boolean }) =>
      apiClient.admin.processLeaveRequest(requestId, approve),
    onSuccess: (_, { approve }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      void queryClient.invalidateQueries({ queryKey: ['map-data', familyId] })
      toast(approve ? 'Member removed from family' : 'Leave request rejected', 'neutral')
    },
    onError: () => toast('Failed to process request', 'error'),
  })

  const deleteFamilyMutation = useMutation({
    mutationFn: () => apiClient.admin.deleteFamily(),
    onSuccess: () => {
      toast('Family deleted', 'neutral')
      void queryClient.invalidateQueries({ queryKey: ['admin-family'] })
      router.replace('/admin')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete family'
      toast(msg, 'error')
      setConfirmDeleteFamily(false)
    },
  })

  const handleNameSave = () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === familyName) { setIsEditingName(false); return }
    updateNameMutation.mutate(trimmed)
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-36">
      <header className="bg-white border-b border-stone-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          {isEditingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSave()
                if (e.key === 'Escape') { setIsEditingName(false); setNameDraft(familyName) }
              }}
              onBlur={handleNameSave}
              className="text-base font-semibold text-slate-800 bg-stone-100 rounded-lg px-2 py-1 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          ) : (
            <button
              onClick={() => { setNameDraft(familyName); setIsEditingName(true) }}
              className="flex items-center gap-1.5 text-left"
            >
              <h1 className="text-base font-semibold text-slate-800">{familyName}</h1>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-slate-300">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/members"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-stone-50 hover:bg-stone-100 text-slate-600 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
            </svg>
            Members ({members.length})
          </Link>
          <Link
            href="/map"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-stone-50 hover:bg-stone-100 text-slate-600 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            </svg>
            View Map
          </Link>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-5">

        {/* ── Share family tree card ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Share Family Tree</p>
          <p className="text-xs text-slate-400 mb-3">
            Generate a read-only link valid for 30 days. Anyone with the link can view (not edit) the family tree.
          </p>
          <ShareLinkSection />
        </div>

        {/* ── Leave requests ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Leave Requests {leaveRequests.length > 0 ? `(${leaveRequests.length})` : ''}
          </p>
          {leaveRequests.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No pending leave requests.</p>
          ) : (
            <ul className="space-y-3">
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
            </ul>
          )}
        </div>

        {/* ── Danger zone ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Danger Zone</p>
          <p className="text-xs text-slate-400 mb-3">
            Permanently delete this family and everything in it. This cannot be undone.
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

      </div>
    </div>
  )
}

function ShareLinkSection() {
  const toast = useToastStore((s) => s.toast)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  const createTokenMutation = useMutation({
    mutationFn: () => apiClient.createShareToken(),
    onSuccess: ({ token }) => {
      const url = `${window.location.origin}/share/${token}`
      setShareUrl(url)
    },
    onError: () => toast('Failed to create share link', 'error'),
  })

  const handleCopy = () => {
    if (!shareUrl) return
    void navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (shareUrl) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-100">
          <p className="text-[10px] font-mono text-slate-600 flex-1 break-all leading-relaxed">{shareUrl}</p>
          <button
            onClick={handleCopy}
            className="shrink-0 px-2 py-1 text-xs font-medium bg-white border border-stone-200 text-slate-600 rounded-lg hover:bg-stone-100 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button
          onClick={() => { setShareUrl(null) }}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Generate another link
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => createTokenMutation.mutate()}
      disabled={createTokenMutation.isPending}
      className="w-full py-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors disabled:opacity-50"
    >
      {createTokenMutation.isPending ? 'Generating…' : 'Generate share link'}
    </button>
  )
}
