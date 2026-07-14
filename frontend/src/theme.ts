import type { AppSettings } from './types'

export type ThemePreference = AppSettings['appearance']['theme']

export function applyThemePreference(theme: ThemePreference = 'light') {
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  const sync = () => {
    const dark = theme === 'dark' || (theme === 'system' && media.matches)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }

  sync()

  if (theme !== 'system') {
    return () => undefined
  }

  media.addEventListener('change', sync)
  return () => media.removeEventListener('change', sync)
}
