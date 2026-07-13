import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, tokenStorage } from '../api/client'
import type { User } from '../types'

type AuthContextValue = {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStorage.get())
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    let cancelled = false

    if (!token) {
      setLoading(false)
      setUser(null)
      return
    }

    setLoading(true)
    api
      .me()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser)
        }
      })
      .catch(() => {
        tokenStorage.clear()
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      async login(email: string, password: string) {
        const result = await api.login(email, password)
        tokenStorage.set(result.token)
        setToken(result.token)
        setUser(result.user)
      },
      async logout() {
        try {
          await api.logout()
        } finally {
          tokenStorage.clear()
          setToken(null)
          setUser(null)
        }
      },
    }),
    [loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
