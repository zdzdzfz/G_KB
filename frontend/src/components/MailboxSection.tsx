import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Mail, MoreHorizontal, Pause, Play, RefreshCcw, Trash2 } from 'lucide-react'
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
}: {
  mailbox: GoogleMailbox
  filters: MessageFilters
  page: number
  onPageChange: (mailboxId: number, page: number) => void
  onOpenMessage: (message: EmailMessage) => void
}) {
  const queryClient = useQueryClient()
  const cardsPerPage = useCardsPerPage()
  const [menuOpen, setMenuOpen] = useState(false)

  const messagesQuery = useQuery({
    queryKey: ['messages', mailbox.id, filters],
    queryFn: () => api.messages(mailbox.id, filters),
    enabled: mailbox.status !== 'reconnect_required',
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
  const pageCount = Math.max(1, Math.ceil(messages.length / cardsPerPage))
  const currentPage = Math.min(page, pageCount)
  const pageMessages = useMemo(() => {
    const start = (currentPage - 1) * cardsPerPage
    return messages.slice(start, start + cardsPerPage)
  }, [cardsPerPage, currentPage, messages])

  useEffect(() => {
    if (page !== currentPage) {
      onPageChange(mailbox.id, currentPage)
    }
  }, [currentPage, mailbox.id, onPageChange, page])

  const isBusy =
    syncMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    reconnectMutation.isPending ||
    deleteMutation.isPending

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-red-500 shadow-sm">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-950">{mailbox.email}</h2>
              <StatusBadge status={mailbox.status} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Showing latest 25 messages · Total {mailbox.messages_total} · Last sync {formatDate(mailbox.last_synced_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TextButton onClick={() => syncMutation.mutate(mailbox.id)} disabled={isBusy || mailbox.status === 'paused'}>
            <RefreshCcw className="h-4 w-4" />
            Sync
          </TextButton>
          {mailbox.status === 'paused' ? (
            <IconButton onClick={() => resumeMutation.mutate(mailbox.id)} disabled={isBusy} title="Resume">
              <Play className="h-4 w-4" />
            </IconButton>
          ) : (
            <IconButton onClick={() => pauseMutation.mutate(mailbox.id)} disabled={isBusy} title="Pause">
              <Pause className="h-4 w-4" />
            </IconButton>
          )}
          <div className="relative">
            <IconButton onClick={() => setMenuOpen((open) => !open)} title="More">
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

      <div className="grid grid-cols-[44px_1fr_44px] items-stretch gap-3">
        <button
          type="button"
          onClick={() => onPageChange(mailbox.id, Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="grid min-h-[248px] place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-40"
          title="Previous"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {messagesQuery.isLoading &&
            Array.from({ length: cardsPerPage }).map((_, index) => (
              <div key={index} className="min-h-[248px] animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
            ))}
          {!messagesQuery.isLoading && pageMessages.map((message) => <MessageCard key={message.id} message={message} onOpen={onOpenMessage} />)}
          {!messagesQuery.isLoading && pageMessages.length === 0 && (
            <div className="col-span-full grid min-h-[248px] place-items-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
              No cached messages
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(mailbox.id, Math.min(pageCount, currentPage + 1))}
          disabled={currentPage === pageCount}
          className="grid min-h-[248px] place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-40"
          title="Next"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: pageCount }).map((_, index) => {
          const targetPage = index + 1
          return (
            <button
              key={targetPage}
              type="button"
              onClick={() => onPageChange(mailbox.id, targetPage)}
              className={[
                'h-8 min-w-8 rounded-md border px-2 text-sm',
                targetPage === currentPage ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {targetPage}
            </button>
          )
        })}
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
  const [cardsPerPage, setCardsPerPage] = useState(4)

  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(min-width: 1280px)').matches) {
        setCardsPerPage(4)
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setCardsPerPage(2)
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
