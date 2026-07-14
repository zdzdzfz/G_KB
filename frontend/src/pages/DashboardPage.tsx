import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Copy, Link, RefreshCcw, X } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { FiltersBar } from '../components/FiltersBar'
import { TextButton, IconButton } from '../components/IconButton'
import { MailboxSection } from '../components/MailboxSection'
import { MessageDrawer } from '../components/MessageDrawer'
import type { EmailMessage, MessageFilters } from '../types'

const initialFilters: MessageFilters = {
  search: '',
  category: '',
  placement: '',
  spf: '',
  dkim: '',
  dmarc: '',
  date_from: '',
  date_to: '',
}

const mailboxOrderStorageKey = 'mailauth_mailbox_order'

export function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeMailboxId, setActiveMailboxId] = useState<'all' | number>('all')
  const [filters, setFilters] = useState<MessageFilters>(initialFilters)
  const [pagination, setPagination] = useState<Record<number, number>>({})
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [draggingMailboxId, setDraggingMailboxId] = useState<number | null>(null)
  const [mailboxOrder, setMailboxOrder] = useState<number[]>(readStoredMailboxOrder)
  const debouncedFilters = useDebouncedValue(filters, 300)

  const mailboxesQuery = useQuery({ queryKey: ['mailboxes'], queryFn: api.mailboxes })
  const statsQuery = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: api.stats })
  const topIpsQuery = useQuery({ queryKey: ['dashboard', 'top-sending-ips'], queryFn: api.topSendingIps })
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: api.settings })

  const syncAllMutation = useMutation({
    mutationFn: api.syncAll,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mailboxes'] })
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const mailboxes = mailboxesQuery.data ?? []
  const orderedMailboxes = useMemo(() => orderMailboxes(mailboxes, mailboxOrder), [mailboxes, mailboxOrder])
  const visibleMailboxes = useMemo(
    () => (activeMailboxId === 'all' ? orderedMailboxes : orderedMailboxes.filter((mailbox) => mailbox.id === activeMailboxId)),
    [activeMailboxId, orderedMailboxes],
  )
  const autoSyncEnabled = settingsQuery.data?.general.automatic_synchronization ?? true
  const autoSyncIntervalMs = Math.max(1, settingsQuery.data?.general.sync_interval ?? 1) * 1000
  const syncableMailboxCount = orderedMailboxes.filter((mailbox) => mailbox.status !== 'paused' && mailbox.status !== 'reconnect_required').length

  useDashboardAutoSync({
    enabled: autoSyncEnabled && syncableMailboxCount > 0,
    intervalMs: autoSyncIntervalMs,
    queryClient,
  })

  const saveMailboxOrder = useCallback((order: number[]) => {
    setMailboxOrder(order)
    writeStoredMailboxOrder(order)
  }, [])

  useEffect(() => {
    const normalized = normalizeMailboxOrder(mailboxOrder, mailboxes.map((mailbox) => mailbox.id))
    if (!sameNumberArray(normalized, mailboxOrder)) {
      saveMailboxOrder(normalized)
    }
  }, [mailboxOrder, mailboxes, saveMailboxOrder])

  const updatePage = useCallback((mailboxId: number, page: number) => {
    setPagination((current) => ({ ...current, [mailboxId]: page }))
  }, [])

  useEffect(() => {
    setPagination({})
  }, [debouncedFilters])

  const moveMailbox = useCallback(
    (draggedId: number, targetId: number) => {
      if (draggedId === targetId) return

      const ids = orderedMailboxes.map((mailbox) => mailbox.id)
      const fromIndex = ids.indexOf(draggedId)
      const toIndex = ids.indexOf(targetId)

      if (fromIndex === -1 || toIndex === -1) return

      const nextOrder = [...ids]
      const [movedId] = nextOrder.splice(fromIndex, 1)
      nextOrder.splice(toIndex, 0, movedId)
      saveMailboxOrder(nextOrder)
    },
    [orderedMailboxes, saveMailboxOrder],
  )

  function startMailboxDrag(event: DragEvent<HTMLElement>, mailboxId: number) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(mailboxId))
    setDraggingMailboxId(mailboxId)
  }

  function dropMailbox(targetId: number) {
    if (draggingMailboxId === null) return

    moveMailbox(draggingMailboxId, targetId)
    setDraggingMailboxId(null)
  }

  async function copyAllValues(field: CopyField) {
    const messageGroups = await Promise.all(
      orderedMailboxes.map((mailbox) =>
        queryClient.fetchQuery({
          queryKey: ['messages', mailbox.id, debouncedFilters],
          queryFn: () => api.messages(mailbox.id, debouncedFilters),
        }),
      ),
    )
    const values = collectMessageValues(messageGroups.flat(), field)

    if (values.length > 0) {
      await navigator.clipboard.writeText(values.join('\n'))
    }
  }

  return (
    <>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-normal text-slate-950">Active Mailboxes</h1>
          <p className="mt-0.5 text-xs text-slate-500">{statsQuery.data?.mailboxes.active ?? 0} connected or syncing</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <TextButton variant="primary" onClick={() => setInviteOpen(true)}>
            <Link className="h-3.5 w-3.5" />
            Generate Link
          </TextButton>
          <div className="grid h-8 w-8 place-items-center rounded-md bg-emerald-100 text-xs font-semibold text-emerald-700">
            {(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <section className="mb-2 grid gap-2 md:grid-cols-4">
        <StatCard label="Cached messages" value={statsQuery.data?.messages.cached ?? 0} />
        <StatCard label="Inbox" value={statsQuery.data?.messages.inbox ?? 0} tone="green" />
        <StatCard label="Spam" value={statsQuery.data?.messages.spam ?? 0} tone="red" />
        <StatCard label="Auth pass rate" value={`${statsQuery.data?.messages.auth_pass_rate ?? 0}%`} />
      </section>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveMailboxId('all')}
          className={tabClass(activeMailboxId === 'all')}
        >
          All Mailboxes
        </button>
        {orderedMailboxes.map((mailbox) => (
          <button
            key={mailbox.id}
            type="button"
            draggable
            onClick={() => setActiveMailboxId(mailbox.id)}
            onDragStart={(event) => startMailboxDrag(event, mailbox.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              dropMailbox(mailbox.id)
            }}
            onDragEnd={() => setDraggingMailboxId(null)}
            className={tabClass(activeMailboxId === mailbox.id, draggingMailboxId === mailbox.id)}
            title="Drag to reorder"
          >
            {mailbox.email}
          </button>
        ))}
        <button type="button" onClick={() => setInviteOpen(true)} className="rounded-md border border-dashed border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
          Generate Link
        </button>
      </div>

      <div className="mb-2">
        <FiltersBar filters={filters} onChange={setFilters} />
      </div>

      {topIpsQuery.data && topIpsQuery.data.length > 0 && (
        <section className="mb-3 rounded-lg border border-slate-200 bg-white/80 p-2.5 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-slate-900">Top sending IPs</p>
          <div className="flex flex-wrap gap-1.5">
            {topIpsQuery.data.map((ip) => (
              <span key={ip.observed_sending_ip} className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                {ip.observed_sending_ip} · {ip.total}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mb-3 flex justify-end">
        <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-emerald-100 bg-emerald-50/70 p-0.5 shadow-sm">
          <span className="px-1 text-[9px] font-semibold uppercase tracking-normal text-emerald-700">All</span>
          <TextButton variant="toolbarPrimary" title="Refresh all mailboxes" onClick={() => syncAllMutation.mutate({ automatic: false })} disabled={syncAllMutation.isPending || orderedMailboxes.length === 0}>
            <RefreshCcw className="h-3 w-3" />
            Refresh
          </TextButton>
          <TextButton variant="toolbar" title="Copy all domains" onClick={() => copyAllValues('domain')} disabled={orderedMailboxes.length === 0}>
            <Copy className="h-3 w-3" />
            Domains
          </TextButton>
          <TextButton variant="toolbar" title="Copy all IPs" onClick={() => copyAllValues('ip')} disabled={orderedMailboxes.length === 0}>
            <Copy className="h-3 w-3" />
            IPs
          </TextButton>
        </div>
      </div>

      <div className="space-y-2">
        {mailboxesQuery.isLoading && <div className="rounded-lg border border-slate-200 bg-white p-6 text-xs text-slate-500 shadow-sm">Loading mailboxes</div>}
        {!mailboxesQuery.isLoading && visibleMailboxes.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-xs text-slate-500 shadow-sm">No connected mailboxes</div>
        )}
        {visibleMailboxes.map((mailbox) => (
          <MailboxSection
            key={mailbox.id}
            mailbox={mailbox}
            filters={debouncedFilters}
            page={pagination[mailbox.id] ?? 1}
            onPageChange={updatePage}
            onOpenMessage={setSelectedMessage}
            dragging={draggingMailboxId === mailbox.id}
            onDragStart={(event) => startMailboxDrag(event, mailbox.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropMailbox(mailbox.id)}
            onDragEnd={() => setDraggingMailboxId(null)}
          />
        ))}
      </div>

      <MessageDrawer message={selectedMessage} onClose={() => setSelectedMessage(null)} />
      {inviteOpen && <InviteLinkModal onClose={() => setInviteOpen(false)} />}
    </>
  )
}

function InviteLinkModal({ onClose }: { onClose: () => void }) {
  const [targetEmail, setTargetEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const inviteMutation = useMutation({
    mutationFn: () => api.createGoogleInvitation(targetEmail.trim()),
    onSuccess: (result) => {
      setInviteUrl(result.url)
      navigator.clipboard.writeText(result.url)
    },
  })

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Generate Gmail link</h2>
            <p className="mt-1 text-sm text-slate-500">Send this OAuth link to the Gmail owner.</p>
          </div>
          <IconButton onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <label className="mb-4 block">
          <span className="text-sm font-medium text-slate-700">Target Gmail</span>
          <input
            value={targetEmail}
            onChange={(event) => setTargetEmail(event.target.value)}
            type="email"
            placeholder="name@gmail.com"
            className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
          />
        </label>

        <TextButton variant="primary" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
          <Link className="h-4 w-4" />
          Generate and Copy
        </TextButton>

        {inviteUrl && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-slate-500">Copied link</p>
            <div className="flex gap-2">
              <input readOnly value={inviteUrl} className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700" />
              <IconButton onClick={() => navigator.clipboard.writeText(inviteUrl)} title="Copy link">
                <Copy className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        )}

        {inviteMutation.isError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Could not generate the link.</p>}
      </section>
    </div>
  )
}

function StatCard({ label, value, tone = 'green' }: { label: string; value: string | number; tone?: 'indigo' | 'green' | 'red' }) {
  const toneClass = {
    indigo: 'text-indigo-700',
    green: 'text-emerald-700',
    red: 'text-red-700',
  }[tone]

  return (
    <div className="rounded-lg border border-slate-200 bg-white/75 p-2.5 shadow-sm ring-1 ring-emerald-50">
      <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function useDashboardAutoSync({ enabled, intervalMs, queryClient }: { enabled: boolean; intervalMs: number; queryClient: QueryClient }) {
  useEffect(() => {
    if (!enabled) return undefined

    let running = false
    let cancelled = false

    const sync = async () => {
      if (running || document.hidden) return

      running = true
      try {
        await api.syncAll({ automatic: true })
        if (!cancelled) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['mailboxes'] }),
            queryClient.invalidateQueries({ queryKey: ['messages'] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
          ])
        }
      } catch {
        // Auto sync stays quiet; manual refresh is still available for visible errors.
      } finally {
        running = false
      }
    }

    const firstSync = window.setTimeout(() => void sync(), 1000)
    const interval = window.setInterval(() => void sync(), intervalMs)
    const syncWhenVisible = () => {
      if (!document.hidden) void sync()
    }

    document.addEventListener('visibilitychange', syncWhenVisible)

    return () => {
      cancelled = true
      window.clearTimeout(firstSync)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [enabled, intervalMs, queryClient])
}

function tabClass(active: boolean, dragging = false) {
  return [
    'cursor-move rounded-md border px-2.5 py-1.5 text-xs font-medium transition',
    active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    dragging ? 'opacity-45 ring-2 ring-emerald-300' : '',
  ].join(' ')
}

function readStoredMailboxOrder() {
  try {
    const value = window.localStorage.getItem(mailboxOrderStorageKey)
    if (!value) return []

    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : []
  } catch {
    return []
  }
}

function writeStoredMailboxOrder(order: number[]) {
  try {
    window.localStorage.setItem(mailboxOrderStorageKey, JSON.stringify(order))
  } catch {
    // Local storage can be disabled; the UI still works for the current session.
  }
}

function normalizeMailboxOrder(order: number[], mailboxIds: number[]) {
  const available = new Set(mailboxIds)
  const existing = order.filter((id) => available.has(id))
  const missing = mailboxIds.filter((id) => !existing.includes(id))
  return [...existing, ...missing]
}

function orderMailboxes<T extends { id: number }>(mailboxes: T[], order: number[]) {
  const positions = new Map(order.map((id, index) => [id, index]))
  return [...mailboxes].sort((first, second) => {
    const firstPosition = positions.get(first.id) ?? Number.MAX_SAFE_INTEGER
    const secondPosition = positions.get(second.id) ?? Number.MAX_SAFE_INTEGER

    if (firstPosition !== secondPosition) return firstPosition - secondPosition
    return mailboxes.indexOf(first) - mailboxes.indexOf(second)
  })
}

function sameNumberArray(first: number[], second: number[]) {
  return first.length === second.length && first.every((value, index) => value === second[index])
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])

  return debouncedValue
}

type CopyField = 'domain' | 'ip'

function collectMessageValues(messages: EmailMessage[], field: CopyField) {
  return Array.from(
    new Set(
      messages
        .map((message) => (field === 'domain' ? message.from_domain : message.observed_sending_ip))
        .filter(Boolean) as string[],
    ),
  )
}
