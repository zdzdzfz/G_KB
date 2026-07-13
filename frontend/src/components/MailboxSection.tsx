import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Copy, GripVertical, Mail, MoreHorizontal, Pause, Play, RefreshCcw, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { StatusBadge } from './Badges'
import { IconButton, TextButton } from './IconButton'
import { MessageCard } from './MessageCard'
import type { EmailMessage, GoogleMailbox, MessageFilters } from '../types'

export function MailboxSection({
  mailbox,
  filters,
  page,
  onPageChange,
  onOpenMessage,
  dragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  mailbox: GoogleMailbox
  filters: MessageFilters
  page: number
  onPageChange: (mailboxId: number, page: number) => void
  onOpenMessage: (message: EmailMessage) => void
  dragging?: boolean
  onDragStart?: (event: DragEvent<HTMLElement>) => void
  onDragOver?: (event: DragEvent<HTMLElement>) => void
  onDrop?: () => void
  onDragEnd?: () => void
}) {
  const queryClient = useQueryClient()
  const cardsPerPage = useCardsPerPage()
  const [menuOpen, setMenuOpen] = useState(false)

  const messagesQuery = useQuery({
    queryKey: ['messages', mailbox.id, filters],
    queryFn: ({ signal }) => api.messages(mailbox.id, filters, signal),
    enabled: mailbox.status !== 'reconnect_required',
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const syncMutation = useMailboxMutation((id) => api.syncMailbox(id))
  const pauseMutation = useMailboxMutation((id) => api.pauseMailbox(id))
  const resumeMutation = useMailboxMutation((id) => api.resumeMailbox(id))
  const reconnectMutation = useMutation({
    mutationFn: () => api.reconnectMailbox(mailbox.id),
    onSuccess: ({ redirect_url }) => {
      window.location.href = redirect_url
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteMailbox(mailbox.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mailboxes'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const messages = messagesQuery.data ?? []
  const mailboxDomains = collectMessageValues(messages, 'domain')
  const mailboxIps = collectMessageValues(messages, 'ip')
  const maxPosition = Math.max(1, messages.length - cardsPerPage + 1)
  const currentPosition = Math.min(Math.max(page, 1), maxPosition)
  const pageMessages = useMemo(() => {
    const start = currentPosition - 1
    return messages.slice(start, start + cardsPerPage)
  }, [cardsPerPage, currentPosition, messages])

  useEffect(() => {
    if (page !== currentPosition) {
      onPageChange(mailbox.id, currentPosition)
    }
  }, [currentPosition, mailbox.id, onPageChange, page])

  const isBusy =
    syncMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    reconnectMutation.isPending ||
    deleteMutation.isPending

  async function copyMailboxValues(field: CopyField) {
    const values = field === 'domain' ? mailboxDomains : mailboxIps

    if (values.length > 0) {
      await navigator.clipboard.writeText(values.join('\n'))
    }
  }

  return (
    <section
      className={['space-y-4 transition', dragging ? 'opacity-45 ring-2 ring-emerald-300' : ''].join(' ')}
      onDragOver={onDragOver}
      onDrop={(event) => {
        event.preventDefault()
        onDrop?.()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="grid h-10 w-7 shrink-0 cursor-move place-items-center rounded-md text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            title="Drag to reorder mailbox"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-950">{mailbox.email}</h2>
              <StatusBadge status={mailbox.status} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Showing latest 25 messages - Total {mailbox.messages_total} - Last sync {formatDate(mailbox.last_synced_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-900/10 bg-slate-900 p-1 shadow-md shadow-slate-900/10">
          <TextButton variant="toolbarPrimary" onClick={() => syncMutation.mutate(mailbox.id)} disabled={isBusy || mailbox.status === 'paused'}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </TextButton>
          <TextButton variant="toolbar" onClick={() => copyMailboxValues('domain')} disabled={mailboxDomains.length === 0}>
            <Copy className="h-3.5 w-3.5" />
            Domains
          </TextButton>
          <TextButton variant="toolbar" onClick={() => copyMailboxValues('ip')} disabled={mailboxIps.length === 0}>
            <Copy className="h-3.5 w-3.5" />
            IPs
          </TextButton>
          {mailbox.status === 'paused' ? (
            <IconButton variant="toolbar" onClick={() => resumeMutation.mutate(mailbox.id)} disabled={isBusy} title="Resume">
              <Play className="h-4 w-4" />
            </IconButton>
          ) : (
            <IconButton variant="toolbar" onClick={() => pauseMutation.mutate(mailbox.id)} disabled={isBusy} title="Pause">
              <Pause className="h-4 w-4" />
            </IconButton>
          )}
          <div className="relative">
            <IconButton variant="toolbar" onClick={() => setMenuOpen((open) => !open)} title="More">
              <MoreHorizontal className="h-4 w-4" />
            </IconButton>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => reconnectMutation.mutate()}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reconnect
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Disconnect ${mailbox.email}?`)) {
                      deleteMutation.mutate()
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mailbox.status === 'reconnect_required' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Reconnect required
          <TextButton className="ml-3" onClick={() => reconnectMutation.mutate()} disabled={isBusy}>
            Reconnect
          </TextButton>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => onPageChange(mailbox.id, Math.max(1, currentPosition - 1))}
          disabled={currentPosition === 1}
          className="absolute left-0 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-md transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 md:-left-1"
          title="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="grid gap-2 px-7 md:grid-cols-4 md:px-8 xl:grid-cols-8">
          {messagesQuery.isLoading &&
            Array.from({ length: cardsPerPage }).map((_, index) => (
              <div key={index} className="min-h-[172px] animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
            ))}
          {!messagesQuery.isLoading && pageMessages.map((message) => <MessageCard key={message.id} message={message} onOpen={onOpenMessage} />)}
          {!messagesQuery.isLoading && pageMessages.length === 0 && (
            <div className="col-span-full grid min-h-[172px] place-items-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
              No cached messages
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(mailbox.id, Math.min(maxPosition, currentPosition + 1))}
          disabled={currentPosition === maxPosition}
          className="absolute right-0 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-md transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 md:-right-1"
          title="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

    </section>
  )
}

function useMailboxMutation(action: (id: number) => Promise<GoogleMailbox>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mailboxes'] })
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

function useCardsPerPage() {
  const [cardsPerPage, setCardsPerPage] = useState(8)

  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(min-width: 1280px)').matches) {
        setCardsPerPage(8)
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setCardsPerPage(4)
      } else {
        setCardsPerPage(1)
      }
    }

    update()
    window.addEventListener('resize', update)

    return () => window.removeEventListener('resize', update)
  }, [])

  return cardsPerPage
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never'
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
