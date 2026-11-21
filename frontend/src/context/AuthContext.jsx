/**
 * AuthContext.jsx — React context for authentication state management.
 * Provides login, logout, and current user throughout the app.
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Hydrate from localStorage on mount
    const saved = localStorage.getItem('tg_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Validate token on app load
    const token = localStorage.getItem('tg_token')
    if (token) {
      authAPI.me()
        .then(res => {
          setUser(res.data)
          localStorage.setItem('tg_user', JSON.stringify(res.data))
        })
        .catch(() => {
          localStorage.removeItem('tg_token')
          localStorage.removeItem('tg_user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login({ username: email, email, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('tg_token', access_token)
    const userToSet = userData || (await authAPI.me()).data
    setUser(userToSet)
    localStorage.setItem('tg_user', JSON.stringify(userToSet))
    return userToSet
  }

  const logout = () => {
    localStorage.removeItem('tg_token')
    localStorage.removeItem('tg_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
