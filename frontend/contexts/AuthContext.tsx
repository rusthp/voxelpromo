'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await api.get('/auth/me')
      if (response.data.success) {
        setUser(response.data.user)
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setUser(response.data.user)
        router.push('/')
      } else {
        throw new Error('Login failed')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao fazer login'
      throw new Error(errorMessage)
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { username, email, password })
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setUser(response.data.user)
        router.push('/')
      } else {
        throw new Error(response.data.error || 'Erro ao criar conta')
      }
    } catch (error: any) {
      // Get detailed error message
      let errorMessage = 'Erro ao criar conta'
      
      console.error('Register error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config?.url
      })
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Erro de conexão. Verifique se o backend está rodando em http://localhost:3000'
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Tempo de espera esgotado. O servidor está demorando para responder.'
      } else if (error.message?.includes('Network Error') || error.message?.includes('network')) {
        errorMessage = 'Erro de rede. Verifique se o backend está rodando e acessível.'
      } else if (error.response?.status === 400) {
        errorMessage = 'Dados inválidos. Verifique os campos preenchidos.'
      } else if (error.response?.status === 500) {
        errorMessage = 'Erro no servidor. Tente novamente mais tarde.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

