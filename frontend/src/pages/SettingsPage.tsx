import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pause, Play, RefreshCcw, Save, Trash2, Undo2 } from 'lucide-react'
import { api } from '../api/client'
import { StatusBadge } from '../components/Badges'
import { IconButton, TextButton } from '../components/IconButton'
import { applyThemePreference } from '../theme'
import type { AppSettings, GoogleMailbox } from '../types'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: api.settings })
  const mailboxesQuery = useQuery({ queryKey: ['mailboxes'], queryFn: api.mailboxes })
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data)
    }
  }, [settingsQuery.data])

  useEffect(() => {
    if (!settings) return undefined
    return applyThemePreference(settings.appearance.theme)
  }, [settings?.appearance.theme])

  const saveMutation = useMutation({
    mutationFn: (payload: AppSettings) => api.updateSettings(payload),
    onSuccess: (saved) => {
      setSettings(saved)
      queryClient.setQueryData(['settings'], saved)
    },
  })

  const resetMutation = useMutation({
    mutationFn: api.resetSettings,
    onSuccess: (saved) => {
      setSettings(saved)
      queryClient.setQueryData(['settings'], saved)
    },
  })

  if (!settings) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading settings</div>
  }

  const update = <Group extends keyof AppSettings, Key extends keyof AppSettings[Group]>(group: Group, key: Key, value: AppSettings[Group][Key]) => {
    setSettings((current) => (current ? { ...current, [group]: { ...current[group], [key]: value } } : current))
  }

  const messageDisplay = settings.message_display

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">MailAuth Monitor</p>
        </div>
        <div className="flex gap-2">
          <TextButton onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
            <Undo2 className="h-4 w-4" />
            Reset
          </TextButton>
          <TextButton variant="primary" onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Save
          </TextButton>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="General">
          <Select label="Language" value={settings.general.language} onChange={(value) => update('general', 'language', value)} options={['en', 'fr', 'es', 'de']} />
          <Input label="Timezone" value={settings.general.timezone} onChange={(value) => update('general', 'timezone', value)} />
          <Select label="Default date range" value={settings.general.default_date_range} onChange={(value) => update('general', 'default_date_range', value as AppSettings['general']['default_date_range'])} options={['24h', '7d', '14d', '30d', '90d']} />
          <Toggle label="Automatic synchronization" checked={settings.general.automatic_synchronization} onChange={(value) => update('general', 'automatic_synchronization', value)} />
          <Select
            label="Sync interval (seconds)"
            value={String(settings.general.sync_interval)}
            onChange={(value) => update('general', 'sync_interval', Number(value) as AppSettings['general']['sync_interval'])}
            options={['1', '5', '10', '15', '30', '60']}
          />
        </Panel>

        <Panel title="Appearance">
          <Segmented
            label="Theme"
            value={settings.appearance.theme}
            options={['light', 'dark', 'system']}
            onChange={(value) => update('appearance', 'theme', value as AppSettings['appearance']['theme'])}
          />
          <Toggle label="Compact mode" checked={settings.appearance.compact_mode} onChange={(value) => update('appearance', 'compact_mode', value)} />
          <Toggle label="Collapsed sidebar" checked={settings.appearance.collapsed_sidebar} onChange={(value) => update('appearance', 'collapsed_sidebar', value)} />
        </Panel>
      </section>

      <Panel title="Message display">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(messageDisplay).map(([key, value]) => (
            <Toggle
              key={key}
              label={labelFromKey(key)}
              checked={value}
              onChange={(checked) => update('message_display', key as keyof AppSettings['message_display'], checked)}
            />
          ))}
        </div>
      </Panel>

      <ConnectedAccounts mailboxes={mailboxesQuery.data ?? []} />
    </div>
  )
}

function ConnectedAccounts({ mailboxes }: { mailboxes: GoogleMailbox[] }) {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['mailboxes'] })
    await queryClient.invalidateQueries({ queryKey: ['messages'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const syncMutation = useMutation({ mutationFn: api.syncMailbox, onSuccess: invalidate })
  const pauseMutation = useMutation({ mutationFn: api.pauseMailbox, onSuccess: invalidate })
  const resumeMutation = useMutation({ mutationFn: api.resumeMailbox, onSuccess: invalidate })
  const reconnectMutation = useMutation({
    mutationFn: api.reconnectMailbox,
    onSuccess: ({ redirect_url }) => {
      window.location.href = redirect_url
    },
  })
  const deleteMutation = useMutation({ mutationFn: api.deleteMailbox, onSuccess: invalidate })

  return (
    <Panel title="Connected accounts">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-normal text-slate-500">
              <th className="border-b border-slate-200 py-2 font-semibold">Gmail email</th>
              <th className="border-b border-slate-200 py-2 font-semibold">Status</th>
              <th className="border-b border-slate-200 py-2 font-semibold">Last sync</th>
              <th className="border-b border-slate-200 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.map((mailbox) => (
              <tr key={mailbox.id}>
                <td className="border-b border-slate-100 py-3 font-medium text-slate-900">{mailbox.email}</td>
                <td className="border-b border-slate-100 py-3">
                  <StatusBadge status={mailbox.status} />
                </td>
                <td className="border-b border-slate-100 py-3 text-slate-600">{mailbox.last_synced_at ? new Date(mailbox.last_synced_at).toLocaleString() : 'Never'}</td>
                <td className="border-b border-slate-100 py-3">
                  <div className="flex justify-end gap-2">
                    <IconButton title="Sync" onClick={() => syncMutation.mutate(mailbox.id)} disabled={mailbox.status === 'paused'}>
                      <RefreshCcw className="h-4 w-4" />
                    </IconButton>
                    {mailbox.status === 'paused' ? (
                      <IconButton title="Resume" onClick={() => resumeMutation.mutate(mailbox.id)}>
                        <Play className="h-4 w-4" />
                      </IconButton>
                    ) : (
                      <IconButton title="Pause" onClick={() => pauseMutation.mutate(mailbox.id)}>
                        <Pause className="h-4 w-4" />
                      </IconButton>
                    )}
                    <IconButton title="Reconnect" onClick={() => reconnectMutation.mutate(mailbox.id)}>
                      <RefreshCcw className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      title="Disconnect"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm(`Disconnect ${mailbox.email}?`)) {
                          deleteMutation.mutate(mailbox.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
            {mailboxes.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No connected accounts
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-950">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
      />
    </label>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-indigo-200 focus:border-indigo-500 focus:ring-2"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
    </label>
  )
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium capitalize',
              value === option ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function labelFromKey(key: string) {
  return key
    .replace(/^show_/, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
