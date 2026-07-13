import { Copy } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AuthBadge, PlacementBadge } from './Badges'
import type { EmailMessage } from '../types'

export function MessageCard({ message, onOpen }: { message: EmailMessage; onOpen: (message: EmailMessage) => void }) {
  const received = message.received_at ? `${formatDistanceToNow(new Date(message.received_at), { addSuffix: true })}` : 'Unknown time'

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
      className="flex min-h-[248px] w-full flex-col rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PlacementBadge placement={message.placement} />
          {message.gmail_category && (
            <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
              {message.gmail_category}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-500">{received}</span>
      </div>

      <p className="text-sm font-semibold text-slate-950">{message.sender_name || message.sender_email || 'Unknown sender'}</p>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-700">{message.subject || '(No subject)'}</p>

      <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          <span>From: {message.from_domain || 'unknown'}</span>
          <CopyButton value={message.from_domain} label="Copy domain" />
          <span className="text-slate-300">|</span>
          <span>IP: {message.observed_sending_ip || 'unknown'}</span>
          <CopyButton value={message.observed_sending_ip} label="Copy IP" />
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <AuthBadge label="SPF" value={message.spf_result} />
        <AuthBadge label="DKIM" value={message.dkim_result} />
        <AuthBadge label="DMARC" value={message.dmarc_result} />
      </div>
    </article>
  )
}

function CopyButton({ value, label }: { value: string | null; label: string }) {
  async function copy(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    if (value) {
      await navigator.clipboard.writeText(value)
    }
  }

  return (
    <button
      type="button"
      title={label}
      onClick={copy}
      disabled={!value}
      className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  )
}
