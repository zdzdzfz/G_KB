import clsx from 'clsx'
import type { AuthResultName, GoogleMailboxStatus } from '../types'

const authColors: Record<AuthResultName, string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  fail: 'bg-red-50 text-red-700 ring-red-200',
  softfail: 'bg-orange-50 text-orange-700 ring-orange-200',
  neutral: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  none: 'bg-slate-100 text-slate-600 ring-slate-200',
  unknown: 'bg-slate-100 text-slate-600 ring-slate-200',
  temperror: 'bg-orange-50 text-orange-700 ring-orange-200',
  permerror: 'bg-red-50 text-red-700 ring-red-200',
}

const statusColors: Record<GoogleMailboxStatus, string> = {
  connected: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  syncing: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  paused: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  reconnect_required: 'bg-red-50 text-red-700 ring-red-200',
  error: 'bg-red-50 text-red-700 ring-red-200',
}

export function AuthBadge({ label, value, showValue = true }: { label: string; value: AuthResultName; showValue?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md font-semibold uppercase ring-1',
        showValue ? 'px-2 py-1 text-[11px]' : 'px-1.5 py-0.5 text-[11px]',
        authColors[value],
      )}
    >
      {showValue ? `${label}: ${value}` : label}
    </span>
  )
}

export function StatusBadge({ status }: { status: GoogleMailboxStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1', statusColors[status])}>
      {status === 'reconnect_required' ? 'Reconnect required' : status.replace('_', ' ')}
    </span>
  )
}

export function PlacementBadge({ placement, compact = false }: { placement: 'inbox' | 'spam' | 'other'; compact?: boolean }) {
  const classes = {
    inbox: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    spam: 'bg-red-50 text-red-700 ring-red-200',
    other: 'bg-slate-100 text-slate-600 ring-slate-200',
  }[placement]

  return (
    <span className={clsx('inline-flex items-center rounded-md font-semibold capitalize ring-1', compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs', classes)}>
      {placement}
    </span>
  )
}
