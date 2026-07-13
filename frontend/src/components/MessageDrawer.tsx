import { X } from 'lucide-react'
import { AuthBadge, PlacementBadge } from './Badges'
import { IconButton } from './IconButton'
import type { EmailMessage } from '../types'

export function MessageDrawer({ message, onClose }: { message: EmailMessage | null; onClose: () => void }) {
  if (!message) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/20">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Message details</p>
            <p className="text-xs text-slate-500">{message.message_id_header || message.gmail_message_id}</p>
          </div>
          <IconButton onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            <PlacementBadge placement={message.placement} />
            {message.gmail_category && (
              <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
                {message.gmail_category}
              </span>
            )}
            <AuthBadge label="SPF" value={message.spf_result} />
            <AuthBadge label="DKIM" value={message.dkim_result} />
            <AuthBadge label="DMARC" value={message.dmarc_result} />
          </div>

          <Detail label="Sender email" value={message.sender_email} />
          <Detail label="Subject" value={message.subject} />
          <Detail label="Received date" value={message.received_at ? new Date(message.received_at).toLocaleString() : null} />
          <Detail label="Placement" value={message.placement} />
          <Detail label="Category" value={message.gmail_category} />
          <Detail label="From domain" value={message.from_domain} />
          <Detail label="Return-Path" value={message.return_path} />
          <Detail label="Sending IP" value={message.observed_sending_ip} />
          <Detail label="SPF" value={`${message.spf_result}${message.spf_domain ? ` (${message.spf_domain})` : ''}`} />
          <Detail label="DKIM" value={`${message.dkim_result}${message.dkim_domain ? ` (${message.dkim_domain})` : ''}`} />
          <Detail label="DMARC" value={`${message.dmarc_result}${message.dmarc_domain ? ` (${message.dmarc_domain})` : ''}`} />
          <Detail label="DKIM domain and selector" value={[message.dkim_domain, message.dkim_selector].filter(Boolean).join(' / ') || null} />
          <Detail label="Message-ID" value={message.message_id_header} />

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-slate-500">Authentication-Results headers</p>
            <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
              {message.authentication_results_raw || 'Not available'}
            </pre>
          </section>
        </div>
      </aside>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[170px_1fr] gap-3 border-b border-slate-100 pb-3 text-sm">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-slate-900">{value || 'Unknown'}</dd>
    </div>
  )
}
