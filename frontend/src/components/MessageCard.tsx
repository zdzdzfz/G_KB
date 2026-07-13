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
      className="flex min-h-[172px] w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="mb-1.5 flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <PlacementBadge placement={message.placement} compact />
          {message.placement !== 'spam' && message.gmail_category && (
            <span className="max-w-full truncate rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium leading-3 text-indigo-700 ring-1 ring-indigo-200">
              {message.gmail_category}
            </span>
          )}
        </div>
        <span className="shrink-0 whitespace-nowrap pt-0.5 text-[9px] leading-3 text-slate-500">{received}</span>
      </div>

      <p className="truncate text-[10px] font-semibold leading-4 text-slate-950">{message.sender_name || message.sender_email || 'Unknown sender'}</p>
      <p className="mt-0.5 line-clamp-2 min-h-7 text-[9px] leading-[14px] text-slate-700">{message.subject || '(No subject)'}</p>

      <dl className="mt-2 space-y-0.5 rounded-md bg-slate-50 p-1.5 text-[9px] leading-3 text-slate-600 ring-1 ring-slate-200">
        <MetaRow label="From" value={message.from_domain} copyLabel="Copy domain" />
        <MetaRow label="IP" value={message.observed_sending_ip} copyLabel="Copy IP" />
      </dl>

      <div className="mt-auto flex flex-wrap items-start gap-1 pt-2">
        <AuthBadge label="SPF" value={message.spf_result} showValue={false} />
        <AuthBadge label="DKIM" value={message.dkim_result} showValue={false} />
        <AuthBadge label="DMARC" value={message.dmarc_result} showValue={false} />
      </div>
    </article>
  )
}

function MetaRow({ label, value, copyLabel }: { label: string; value: string | null; copyLabel: string }) {
  return (
    <div className="grid grid-cols-[26px_minmax(0,1fr)_16px] items-center gap-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-medium text-slate-700" title={value || undefined}>
        {value || 'unknown'}
      </dd>
      <CopyButton value={value} label={copyLabel} />
    </div>
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
      className="inline-flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30"
    >
      <Copy className="h-3 w-3" />
    </button>
  )
}
