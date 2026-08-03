'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { CreateNikIdentitySchema, type CreateNikIdentityDto } from '@genyra/shared-types'
import { useMemo } from 'react'
import { apiClient, type AdminMember } from '@/lib/api-client'
import { useToastStore } from '@/store/map-store'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FONT } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default function AdminMembersPage() {
  const router      = useRouter()
  const toast       = useToastStore((s) => s.toast)
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin-members'],
    queryFn:  () => apiClient.admin.listMembers(),
  })

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter((m: AdminMember) =>
      m.node.displayName.toLowerCase().includes(q) ||
      (m.node.surname?.toLowerCase().includes(q) ?? false) ||
      (m.nik?.toLowerCase().includes(q) ?? false),
    )
  }, [members, search])

  const invalidateMembers = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-members'] })
    void queryClient.invalidateQueries({ queryKey: ['map-data'] })
  }

  return (
    <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-950 overflow-y-auto pb-20 min-h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-slate-500 dark:text-stone-400 hover:text-slate-700 dark:hover:text-stone-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className={cn(FONT.HEADING_SM, 'font-semibold text-slate-700 dark:text-stone-200 flex-1')}>Members</h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="px-3 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add member'}
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-4">
        {showAddForm && (
          <AddNikIdentityForm
            onSuccess={() => { setShowAddForm(false); invalidateMembers(); toast('Member added to the family tree', 'success') }}
          />
        )}

        {members.length > 0 && (
          <Input
            id="memberSearch"
            placeholder="Search by name or NIK…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-stone-400 text-center py-10">No members yet. Add one to get started.</p>
        ) : filteredMembers.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-stone-400 text-center py-10">No members match &quot;{search}&quot;.</p>
        ) : (
          <ul className="space-y-3">
            {filteredMembers.map((m: AdminMember) => (
              <MemberRow key={m.node.id} member={m} onChanged={invalidateMembers} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Add NIK identity form ─────────────────────────────────────────────────────

function AddNikIdentityForm({ onSuccess }: { onSuccess: () => void }) {
  const toast = useToastStore((s) => s.toast)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateNikIdentityDto>({
    resolver: zodResolver(CreateNikIdentitySchema),
  })

  const mutation = useMutation({
    mutationFn: (values: CreateNikIdentityDto) => apiClient.admin.createNikIdentity(values),
    onSuccess: () => {
      reset()
      onSuccess()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add member'
      toast(msg, 'error')
    },
  })

  return (
    <form
      onSubmit={(e) => void handleSubmit((v) => mutation.mutate(v))(e)}
      className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-slate-500 dark:text-stone-400 uppercase tracking-wide">New family member</p>

      <Input
        id="displayName"
        label="Full name"
        placeholder="Full name"
        {...register('displayName')}
        error={errors.displayName?.message}
      />

      <Input
        id="nik"
        label="NIK (16 digits)"
        placeholder="3276011009040006"
        maxLength={16}
        inputMode="numeric"
        {...register('nik')}
        error={errors.nik?.message}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-stone-200">Gender</label>
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
                      ? g === 'MALE' ? 'bg-sky-50 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300' : 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-slate-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800',
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
        id="surname"
        label="Nickname / panggilan"
        placeholder="e.g. Vian"
        {...register('surname')}
        error={errors.surname?.message ?? undefined}
      />

      <Input
        id="birthDate"
        type="date"
        label="Date of birth"
        {...register('birthDate')}
        error={errors.birthDate?.message ?? undefined}
      />

      <Input
        id="birthPlace"
        label="Place of birth"
        placeholder="Jakarta"
        {...register('birthPlace')}
        error={errors.birthPlace?.message ?? undefined}
      />

      <div className="flex items-center justify-between py-1">
        <label htmlFor="isDeceased" className="text-sm font-medium text-slate-700 dark:text-stone-200">Deceased</label>
        <Controller
          name="isDeceased"
          control={control}
          render={({ field }) => (
            <button
              id="isDeceased"
              type="button"
              role="switch"
              aria-checked={field.value ?? false}
              onClick={() => field.onChange(!field.value)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                field.value ? 'bg-slate-500 dark:bg-stone-500' : 'bg-stone-200 dark:bg-stone-700',
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                field.value ? 'translate-x-6' : 'translate-x-1',
              )} />
            </button>
          )}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
        {mutation.isPending ? 'Adding…' : 'Add member'}
      </Button>
    </form>
  )
}

// ── Member row: status toggle + linked accounts management ───────────────────

function MemberRow({ member, onChanged }: { member: AdminMember; onChanged: () => void }) {
  const toast = useToastStore((s) => s.toast)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [pendingUnlink, setPendingUnlink] = useState<{ accountId: string; email: string } | null>(null)

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'DEACTIVATED') => apiClient.admin.setNikStatus(member.nik!, status),
    onSuccess: () => {
      onChanged()
      toast('Status updated', 'success')
      setConfirmDeactivate(false)
    },
    onError: () => {
      toast('Failed to update status', 'error')
      setConfirmDeactivate(false)
    },
  })

  const linkMutation = useMutation({
    mutationFn: (emailToLink: string) => apiClient.admin.linkAccount(member.nik!, { email: emailToLink }),
    onSuccess: () => {
      setShowLinkForm(false)
      setEmail('')
      onChanged()
      toast('Account linked', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to link account'
      toast(msg, 'error')
    },
  })

  const unlinkMutation = useMutation({
    mutationFn: (accountId: string) => apiClient.admin.unlinkAccount(member.nik!, accountId),
    onSuccess: () => {
      onChanged()
      toast('Account unlinked', 'neutral')
      setPendingUnlink(null)
    },
    onError: () => {
      toast('Failed to unlink account', 'error')
      setPendingUnlink(null)
    },
  })

  return (
    <li className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <Avatar src={member.node.avatarUrl} name={member.node.displayName} size="md" />
        <div className="flex-1 min-w-0">
          <p className={cn(FONT.BODY, 'font-semibold text-slate-800 dark:text-stone-100 truncate')}>{member.node.displayName}</p>
          <p className={cn(FONT.LABEL, 'text-slate-400 dark:text-stone-500 font-mono text-[10px]')}>{member.nik ?? 'No NIK (placeholder)'}</p>
        </div>
        {member.nik && (
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0',
            member.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-stone-100 dark:bg-stone-800 text-slate-500 dark:text-stone-400',
          )}>
            {member.status === 'ACTIVE' ? 'Active' : 'Deactivated'}
          </span>
        )}
      </div>

      {member.nik && (
        <div className="mt-3 pt-3 border-t border-stone-50 dark:border-stone-800 space-y-2">
          {/* Linked accounts */}
          {member.linkedAccounts.length > 0 && (
            <ul className="space-y-1.5">
              {member.linkedAccounts.map((acc) => (
                <li key={acc.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 dark:text-stone-300 truncate">
                    {acc.email}
                    {!acc.hasLoggedIn && <span className="text-amber-500 dark:text-amber-400 ml-1">(pending first login)</span>}
                  </span>
                  <button
                    onClick={() => setPendingUnlink({ accountId: acc.id, email: acc.email })}
                    disabled={unlinkMutation.isPending}
                    className="shrink-0 text-slate-300 dark:text-stone-600 hover:text-red-400 transition-colors"
                    title="Unlink account"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Link new account */}
          {showLinkForm ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 text-xs bg-stone-50 dark:bg-stone-800 text-slate-800 dark:text-stone-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
              <button
                onClick={() => email && linkMutation.mutate(email)}
                disabled={!email || linkMutation.isPending}
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 disabled:opacity-40 px-1"
              >
                Link
              </button>
              <button onClick={() => { setShowLinkForm(false); setEmail('') }} className="text-xs text-slate-500 dark:text-stone-400 hover:text-slate-700 dark:hover:text-stone-200 px-1">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {member.linkedAccounts.length < 2 && (
                <button
                  onClick={() => setShowLinkForm(true)}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                >
                  + Link account
                </button>
              )}
              <button
                onClick={() => member.status === 'ACTIVE' ? setConfirmDeactivate(true) : statusMutation.mutate('ACTIVE')}
                disabled={statusMutation.isPending}
                className="text-xs font-medium text-slate-500 dark:text-stone-400 hover:text-slate-700 dark:hover:text-stone-200 disabled:opacity-40 ml-auto"
              >
                {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this NIK?"
        description={`${member.node.displayName} will lose access to the family tree until reactivated.`}
        confirmLabel="Deactivate"
        isLoading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate('DEACTIVATED')}
        onCancel={() => setConfirmDeactivate(false)}
      />

      <ConfirmDialog
        open={pendingUnlink !== null}
        title="Unlink this account?"
        description={`${pendingUnlink?.email} will no longer be able to sign in as ${member.node.displayName}.`}
        confirmLabel="Unlink"
        isLoading={unlinkMutation.isPending}
        onConfirm={() => { if (pendingUnlink) unlinkMutation.mutate(pendingUnlink.accountId) }}
        onCancel={() => setPendingUnlink(null)}
      />
    </li>
  )
}
