import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { applyThemePreference } from '../theme'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: api.settings })

  useEffect(() => {
    return applyThemePreference(settingsQuery.data?.appearance.theme ?? 'dark')
  }, [settingsQuery.data?.appearance.theme])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-20 flex-col border-r border-slate-200 bg-white md:w-64">
        <div className="flex h-16 items-center justify-center gap-3 border-b border-slate-200 px-3 md:justify-start md:px-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold">MailAuth Monitor</p>
            <p className="text-xs text-slate-500">Gmail authentication</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavItem to="/dashboard" icon={<BarChart3 className="h-4 w-4" />} label="Dashboard" />
          <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="m-3 inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-300 hover:bg-slate-50 md:justify-start"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </aside>

      <main className="min-h-screen pl-20 md:pl-64">
        <div className="mx-auto max-w-[1540px] px-4 py-5 md:px-6">{children}</div>
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
          'flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sm font-medium md:justify-start',
          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        ].join(' ')
      }
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  )
}
