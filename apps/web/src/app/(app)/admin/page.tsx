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
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
      <div className="min-h-dvh flex items-center justify-center bg-stone-50 dark:bg-stone-950">
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
    <main className="min-h-dvh flex items-center justify-center p-4 bg-brand-50 dark:bg-stone-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/genyra_logo.png" alt="Genyra" className="h-20 w-20 mx-auto mb-4" />
          <h1 className={cn(FONT.HEADING_LG, 'font-semibold text-slate-800 dark:text-stone-100')}>Create your family tree</h1>
          <p className={cn(FONT.BODY, 'text-slate-500 dark:text-stone-400 mt-1')}>
            As the admin, you&apos;ll manage members, relationships, and access for this family.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}
          className="space-y-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-6"
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
            <label htmlFor="familyDescription" className="text-sm font-medium text-slate-700 dark:text-stone-200">
              Description <span className="text-slate-500 dark:text-stone-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="familyDescription"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note about this family…"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-stone-100 resize-none placeholder:text-slate-500 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
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
  const [pendingLeaveAction, setPendingLeaveAction]   = useState<{ requestId: string; approve: boolean; displayName: string } | null>(null)

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
      setPendingLeaveAction(null)
    },
    onError: () => {
      toast('Failed to process request', 'error')
      setPendingLeaveAction(null)
    },
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
    <div className="min-h-dvh bg-stone-50 dark:bg-stone-950 pb-36">
      <header className="bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto w-full">
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
                className="text-base font-semibold text-slate-800 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 rounded-lg px-2 py-1 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            ) : (
              <button
                onClick={() => { setNameDraft(familyName); setIsEditingName(true) }}
                className="flex items-center gap-1.5 text-left"
              >
                <h1 className="text-base font-semibold text-slate-800 dark:text-stone-100">{familyName}</h1>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-slate-300 dark:text-stone-600">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/members"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-slate-600 dark:text-stone-300 rounded-xl transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
              </svg>
              Members ({members.length})
            </Link>
            <Link
              href="/admin/activity"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-slate-600 dark:text-stone-300 rounded-xl transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M15.5 2A1.5 1.5 0 0 1 17 3.5v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13A1.5 1.5 0 0 1 4.5 2h11ZM6 6.75A.75.75 0 0 1 6.75 6h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 6.75Zm0 3A.75.75 0 0 1 6.75 9h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 9.75Zm0 3a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
              Activity
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {/* max-w-4xl instead of the old max-w-lg: on desktop viewports the
          narrower container left large empty margins on both sides — this
          keeps the mobile single-column layout intact while giving the
          dashboard room to breathe on wide screens. */}
      <div className="p-4 max-w-4xl mx-auto space-y-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ── Export card ──────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-stone-400 uppercase tracking-wide mb-3">Export</p>
            <p className="text-xs text-slate-500 dark:text-stone-400 mb-3">
              Download the full member list — NIK, names, status, and linked accounts — as an Excel file.
            </p>
            <ExportExcelButton />
          </div>

          {/* ── Danger zone ──────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-red-100 dark:border-red-900/60 p-5">
            <p className="text-xs font-semibold text-red-400 dark:text-red-400 uppercase tracking-wide mb-2">Danger Zone</p>
            <p className="text-xs text-slate-500 dark:text-stone-400 mb-3">
              Permanently delete this family and everything in it. This cannot be undone.
            </p>
            {!confirmDeleteFamily ? (
              <button
                onClick={() => setConfirmDeleteFamily(true)}
                className="w-full py-2 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 rounded-xl transition-colors"
              >
                Delete family…
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-500 dark:text-red-400 font-medium">This will permanently delete the family and all its data. This cannot be undone.</p>
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
                    className="flex-1 py-2 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-slate-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Leave requests ───────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-stone-400 uppercase tracking-wide mb-3">
            Leave Requests {leaveRequests.length > 0 ? `(${leaveRequests.length})` : ''}
          </p>
          {leaveRequests.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-stone-400 text-center py-6">No pending leave requests.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {leaveRequests.map((req: LeaveRequest) => (
                <li key={req.id} className="bg-white dark:bg-stone-900 rounded-xl border border-orange-100 dark:border-orange-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-stone-100 text-sm">{req.displayName}</p>
                      <p className="text-xs text-slate-500 dark:text-stone-400">NIK: {req.nik}</p>
                      <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">Requesting to leave the family</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setPendingLeaveAction({ requestId: req.id, approve: true, displayName: req.displayName })}
                        disabled={processLeaveMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-slate-600 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setPendingLeaveAction({ requestId: req.id, approve: false, displayName: req.displayName })}
                        disabled={processLeaveMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900 disabled:opacity-50"
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

      </div>

      <ConfirmDialog
        open={pendingLeaveAction !== null}
        title={pendingLeaveAction?.approve ? 'Approve leave request?' : 'Reject leave request?'}
        description={
          pendingLeaveAction?.approve
            ? `${pendingLeaveAction.displayName} will be removed from the family tree. This cannot be undone.`
            : `${pendingLeaveAction?.displayName}'s request to leave the family will be dismissed.`
        }
        confirmLabel={pendingLeaveAction?.approve ? 'Approve' : 'Reject'}
        tone={pendingLeaveAction?.approve ? 'danger' : 'neutral'}
        isLoading={processLeaveMutation.isPending}
        onConfirm={() => { if (pendingLeaveAction) processLeaveMutation.mutate({ requestId: pendingLeaveAction.requestId, approve: pendingLeaveAction.approve }) }}
        onCancel={() => setPendingLeaveAction(null)}
      />
    </div>
  )
}

function ExportExcelButton() {
  const toast = useToastStore((s) => s.toast)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await apiClient.admin.downloadMembersExcel()
    } catch {
      toast('Failed to generate export', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button
      onClick={() => void handleDownload()}
      disabled={isDownloading}
      className="w-full py-2 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-xl transition-colors disabled:opacity-50"
    >
      {isDownloading ? 'Preparing…' : 'Download Excel'}
    </button>
  )
}
