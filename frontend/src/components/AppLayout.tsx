import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, MailCheck, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { api } from '../api/client'
import { applyThemePreference } from '../theme'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: api.settings })

  useEffect(() => {
    return applyThemePreference(settingsQuery.data?.appearance.theme ?? 'light')
  }, [settingsQuery.data?.appearance.theme])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[72px] flex-col border-r border-slate-200 bg-white md:w-60">
        <div className="flex h-14 items-center justify-center gap-2.5 border-b border-slate-200 px-2.5 md:justify-start md:px-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
            <MailCheck className="h-4 w-4" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold">G-KB Monitor</p>
            <p className="text-xs text-slate-500">Gmail authentication</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2.5 py-3">
          <NavItem to="/dashboard" icon={<BarChart3 className="h-4 w-4" />} label="Dashboard" />
          <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
        </nav>
      </aside>

      <main className="min-h-screen pl-[72px] md:pl-60">
        <div className="mx-auto max-w-none px-3 py-3 md:px-5">{children}</div>
      </main>
    </div>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center justify-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium md:justify-start',
          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        ].join(' ')
      }
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  )
}
