import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Copy, Link, RefreshCcw, X } from 'lucide-react'
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

export function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeMailboxId, setActiveMailboxId] = useState<'all' | number>('all')
  const [filters, setFilters] = useState<MessageFilters>(initialFilters)
  const [pagination, setPagination] = useState<Record<number, number>>({})
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const mailboxesQuery = useQuery({ queryKey: ['mailboxes'], queryFn: api.mailboxes })
  const statsQuery = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: api.stats })
  const topIpsQuery = useQuery({ queryKey: ['dashboard', 'top-sending-ips'], queryFn: api.topSendingIps })

  const syncAllMutation = useMutation({
    mutationFn: api.syncAll,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mailboxes'] })
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const mailboxes = mailboxesQuery.data ?? []
  const visibleMailboxes = useMemo(
    () => (activeMailboxId === 'all' ? mailboxes : mailboxes.filter((mailbox) => mailbox.id === activeMailboxId)),
    [activeMailboxId, mailboxes],
  )

  const updatePage = useCallback((mailboxId: number, page: number) => {
    setPagination((current) => ({ ...current, [mailboxId]: page }))
  }, [])

  function copyAllDomains() {
    const messageQueries = queryClient.getQueriesData<EmailMessage[]>({ queryKey: ['messages'] })
    const domains = Array.from(
      new Set(
        messageQueries
          .flatMap(([, data]) => data ?? [])
          .map((message) => message.from_domain)
          .filter(Boolean) as string[],
      ),
    )

    if (domains.length > 0) {
      navigator.clipboard.writeText(domains.join('\n'))
    }
  }

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Active Mailboxes</h1>
          <p className="mt-1 text-sm text-slate-500">{statsQuery.data?.mailboxes.active ?? 0} connected or syncing</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TextButton onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending || mailboxes.length === 0}>
            <RefreshCcw className="h-4 w-4" />
            Sync All
          </TextButton>
          <TextButton onClick={copyAllDomains}>
            <Copy className="h-4 w-4" />
            Copy All Domains
          </TextButton>
          <TextButton variant="primary" onClick={() => setInviteOpen(true)}>
            <Link className="h-4 w-4" />
            Generate Link
          </TextButton>
          <IconButton title="Notifications">
            <Bell className="h-4 w-4" />
          </IconButton>
          <div className="grid h-9 w-9 place-items-center rounded-md bg-indigo-100 text-sm font-semibold text-indigo-700">
            {(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <section className="mb-5 grid gap-4 md:grid-cols-4">
        <StatCard label="Cached messages" value={statsQuery.data?.messages.cached ?? 0} />
        <StatCard label="Inbox" value={statsQuery.data?.messages.inbox ?? 0} tone="green" />
        <StatCard label="Spam" value={statsQuery.data?.messages.spam ?? 0} tone="red" />
        <StatCard label="Auth pass rate" value={`${statsQuery.data?.messages.auth_pass_rate ?? 0}%`} />
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveMailboxId('all')}
          className={tabClass(activeMailboxId === 'all')}
        >
          All Mailboxes
        </button>
        {mailboxes.map((mailbox) => (
          <button key={mailbox.id} type="button" onClick={() => setActiveMailboxId(mailbox.id)} className={tabClass(activeMailboxId === mailbox.id)}>
            {mailbox.email}
          </button>
        ))}
        <button type="button" onClick={() => setInviteOpen(true)} className="rounded-md border border-dashed border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
          Generate Link
        </button>
      </div>

      <div className="mb-5">
        <FiltersBar filters={filters} onChange={setFilters} />
      </div>

      {topIpsQuery.data && topIpsQuery.data.length > 0 && (
        <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">Top sending IPs</p>
          <div className="flex flex-wrap gap-2">
            {topIpsQuery.data.map((ip) => (
              <span key={ip.observed_sending_ip} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                {ip.observed_sending_ip} · {ip.total}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-8">
        {mailboxesQuery.isLoading && <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading mailboxes</div>}
        {!mailboxesQuery.isLoading && visibleMailboxes.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">No connected mailboxes</div>
        )}
        {visibleMailboxes.map((mailbox) => (
          <MailboxSection
            key={mailbox.id}
            mailbox={mailbox}
            filters={filters}
            page={pagination[mailbox.id] ?? 1}
            onPageChange={updatePage}
            onOpenMessage={setSelectedMessage}
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

function StatCard({ label, value, tone = 'indigo' }: { label: string; value: string | number; tone?: 'indigo' | 'green' | 'red' }) {
  const toneClass = {
    indigo: 'text-indigo-700',
    green: 'text-emerald-700',
    red: 'text-red-700',
  }[tone]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function tabClass(active: boolean) {
  return [
    'rounded-md border px-3 py-2 text-sm font-medium',
    active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  ].join(' ')
}
