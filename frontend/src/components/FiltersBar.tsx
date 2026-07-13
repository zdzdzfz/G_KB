import { Search } from 'lucide-react'
import type { MessageFilters } from '../types'

const resultOptions = ['pass', 'fail', 'softfail', 'neutral', 'none', 'temperror', 'permerror', 'unknown']

export function FiltersBar({ filters, onChange }: { filters: MessageFilters; onChange: (filters: MessageFilters) => void }) {
  const update = (key: keyof MessageFilters, value: string) => onChange({ ...filters, [key]: value })

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-2 xl:grid-cols-[minmax(230px,1.5fr)_repeat(7,minmax(104px,1fr))]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Search sender, subject, domain, or IP"
            className="h-8 w-full rounded-md border border-slate-300 pl-8 pr-2.5 text-xs outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
          />
        </label>
        <Select label="Category" value={filters.category} onChange={(value) => update('category', value)} options={['Primary', 'Promotions', 'Social', 'Updates', 'Forums']} />
        <Select label="Placement" value={filters.placement} onChange={(value) => update('placement', value)} options={['inbox', 'spam', 'other']} />
        <Select label="SPF" value={filters.spf} onChange={(value) => update('spf', value)} options={resultOptions} />
        <Select label="DKIM" value={filters.dkim} onChange={(value) => update('dkim', value)} options={resultOptions} />
        <Select label="DMARC" value={filters.dmarc} onChange={(value) => update('dmarc', value)} options={resultOptions} />
        <input
          value={filters.date_from}
          onChange={(event) => update('date_from', event.target.value)}
          type="date"
          className="h-8 rounded-md border border-slate-300 px-2.5 text-xs text-slate-600 outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
        />
        <input
          value={filters.date_to}
          onChange={(event) => update('date_to', event.target.value)}
          type="date"
          className="h-8 rounded-md border border-slate-300 px-2.5 text-xs text-slate-600 outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
        />
      </div>
    </section>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-600 outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}
