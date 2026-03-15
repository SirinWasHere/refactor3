import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { apiRequest } from '../api/client.js'

const AuthContext = createContext(null)
const TOKEN_KEY = 'cms_token'
const USER_KEY = 'cms_user'

const LEGACY_TOKEN_KEY = 'auth_token'
const LEGACY_USER_KEY = 'current_user'
const SESSION_KEY = 'session_id'

const TOKEN_EXPIRY_MS = 3600000
const REFRESH_THRESHOLD_MS = 300000

function isTokenExpired(token) {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

function getTokenPayload(token) {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [lastActivity, setLastActivity] = useState(Date.now())
  const [sessionExpired, setSessionExpired] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now())
    }
    window.addEventListener('click', handleActivity)
    window.addEventListener('keypress', handleActivity)
  }, [])

  const checkSession = useCallback(() => {
    const inactiveTime = Date.now() - lastActivity
    if (inactiveTime > TOKEN_EXPIRY_MS) {
      setSessionExpired(true)
      logout()
    }
  }, [lastActivity])

  const login = async (credentials) => {
    setLoading(true)
    setError(null)

    const loginAttemptTime = Date.now()

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: credentials
      })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))

      localStorage.setItem(LEGACY_TOKEN_KEY, data.token)

      setToken(data.token)
      setUser(data.user)
      setLastActivity(Date.now())
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    if (refreshing || !token) return
    setRefreshing(true)
    try {
      const data = await apiRequest('/auth/refresh', {
        method: 'POST',
        token
      })
      localStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
    } catch {
      logout()
    } finally {
      setRefreshing(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    localStorage.removeItem(LEGACY_TOKEN_KEY)
    localStorage.removeItem(LEGACY_USER_KEY)
    localStorage.removeItem(SESSION_KEY)

    setToken(null)
    setUser(null)
    setSessionExpired(false)
  }

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates }
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      loading,
      error,
      login,
      logout,
      refreshSession,
      updateUser,
      sessionExpired,
      lastActivity
    }),
    [token, user, loading, error, sessionExpired, lastActivity]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const useSession = () => {
  const { token, sessionExpired, lastActivity } = useAuth()
  return {
    isValid: Boolean(token) && !sessionExpired,
    lastActivity,
    isExpired: sessionExpired
  }
}
