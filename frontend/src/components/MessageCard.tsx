import clsx from 'clsx'
import { Ban, Check, Copy, Globe, Inbox, Minus, Server, ShieldCheck, X } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import type { AuthResultName, EmailMessage } from '../types'

export function MessageCard({ message, onOpen }: { message: EmailMessage; onOpen: (message: EmailMessage) => void }) {
  const received = message.received_at ? formatDistanceToNowStrict(new Date(message.received_at), { addSuffix: true }) : ''
  const senderName = message.sender_name || (message.sender_email ? 'Unknown' : 'Unknown sender')

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(message)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onOpen(message)
        }
      }}
      className="flex min-h-[200px] w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="mb-1.5 flex items-center justify-between gap-1.5">
        <PlacementLabel message={message} />
        <span className="shrink-0 whitespace-nowrap text-[11px] leading-4 text-slate-500">{received}</span>
      </div>

      <p className="truncate text-[13px] font-semibold leading-5 text-slate-950">{senderName}</p>
      {message.sender_email && <p className="truncate text-[11px] leading-4 text-slate-500">{message.sender_email}</p>}

      <p className="mt-1.5 truncate text-xs font-medium leading-4 text-slate-900" title={message.subject || undefined}>
        {message.subject || '(No subject)'}
      </p>
      <p className="line-clamp-2 min-h-8 text-[11px] leading-4 text-slate-500" title={message.snippet || undefined}>
        {decodeEntities(message.snippet) || 'No preview available'}
      </p>

      <div className="mt-auto pt-2">
        <div className="flex items-center justify-between gap-1 border-t border-slate-100 pt-1.5 text-[11px] font-semibold text-slate-600">
          <ShieldCheck className="h-3 w-3 shrink-0 text-slate-400" />
          <AuthCheck label="SPF" value={message.spf_result} />
          <AuthCheck label="DKIM" value={message.dkim_result} />
          <AuthCheck label="DMARC" value={message.dmarc_result} />
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <CopyChip icon={<Server className="h-3 w-3" />} value={message.observed_sending_ip} label="Copy IP" />
          <CopyChip icon={<Globe className="h-3 w-3" />} value={message.from_domain} label="Copy domain" />
        </div>
      </div>
    </article>
  )
}

function PlacementLabel({ message }: { message: EmailMessage }) {
  if (message.placement === 'spam') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white">
        <Ban className="h-3 w-3" />
        Spam
      </span>
    )
  }

  const label = message.gmail_category || (message.placement === 'inbox' ? 'Inbox' : 'Other')

  return (
    <span
      className={clsx(
        'inline-flex max-w-[70%] items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white',
        message.placement === 'inbox' ? 'bg-emerald-600' : 'bg-slate-500',
      )}
    >
      <Inbox className="h-3 w-3 shrink-0" />
      {label}
    </span>
  )
}

function AuthCheck({ label, value }: { label: string; value: AuthResultName }) {
  const passed = value === 'pass'
  const failed = value === 'fail' || value === 'softfail' || value === 'permerror'
  const Icon = passed ? Check : failed ? X : Minus

  return (
    <span className="inline-flex items-center gap-0.5" title={`${label}: ${value}`}>
      {label}
      <Icon className={clsx('h-3 w-3', passed ? 'text-emerald-600' : failed ? 'text-red-600' : 'text-slate-400')} strokeWidth={3} />
    </span>
  )
}

function CopyChip({ icon, value, label }: { icon: React.ReactNode; value: string | null; label: string }) {
  async function copy(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    if (value) {
      await navigator.clipboard.writeText(value)
    }
  }

  return (
    <button
      type="button"
      title={value ? `${label}: ${value}` : label}
      onClick={copy}
      disabled={!value}
      className="flex h-6 min-w-0 items-center gap-1 rounded-md bg-slate-50 px-1.5 text-[11px] font-medium leading-4 text-slate-700 ring-1 ring-slate-200 hover:bg-white hover:text-emerald-700 disabled:opacity-50"
    >
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-left text-[11px] leading-4">{value || 'unknown'}</span>
      <Copy className="h-3 w-3 shrink-0 text-slate-400" />
    </button>
  )
}

// Gmail snippets arrive HTML-escaped (&#39;, &amp;, ...).
function decodeEntities(text: string | null) {
  if (!text) return ''
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}
