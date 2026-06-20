import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../api'
import type { AuthUser } from '../types'
import { getToken, setToken } from '../authStorage'

type AuthState = {
  user: AuthUser | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (p: {
    email: string
    password: string
    displayName: string
    role: 'student' | 'school'
    code: string
    studentId?: string
    realName?: string
  }) => Promise<{ token: string; user: AuthUser } | { ok: true; message: string } | void>
  logout: () => void
  refreshUser: () => Promise<void>
  updateProfile: (displayName: string, studentId?: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  const refreshUser = useCallback(async () => {
    const t = getToken()
    if (!t) {
      setUser(null)
      return
    }
    try {
      const u = await api.fetchMe()
      setUser(u)
    } catch {
      setToken(null)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (getToken()) await refreshUser()
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await api.login({ email, password })
    setToken(token)
    setUser(u)
  }, [])

  const register = useCallback(
    async (p: {
      email: string
      password: string
      displayName: string
      role: 'student' | 'school'
      code: string
      studentId?: string
      realName?: string
    }) => {
      const result = await api.register(p)
      if ('ok' in result && result.ok) {
        return result
      }
      const { token, user: u } = result as { token: string; user: AuthUser }
      setToken(token)
      setUser(u)
      return result
    },
    []
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (displayName: string, studentId?: string) => {
    const u = await api.updateMe({ displayName, studentId })
    setUser(u)
  }, [])

  const value = useMemo(
    () => ({ user, ready, login, register, logout, refreshUser, updateProfile }),
    [user, ready, login, register, logout, refreshUser, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
