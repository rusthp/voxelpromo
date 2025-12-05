'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { LogIn, UserPlus, Loader, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const { login, register } = useAuth()
  const router = useRouter()

  // Clear any old/invalid tokens on mount to prevent JWT errors
  React.useEffect(() => {
    // Clear localStorage on login page mount to remove stale tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }, [])

  // Check backend status on mount
  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const response = await fetch('http://localhost:3000/health', {
          method: 'GET',
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          setBackendStatus('online')
        } else {
          setBackendStatus('offline')
        }
      } catch (err) {
        setBackendStatus('offline')
      }
    }
    checkBackend()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // Validate login
        if (!email || !password) {
          setError('Email e senha são obrigatórios')
          setLoading(false)
          return
        }
        await login(email, password)
      } else {
        // Validate registration
        if (!username || !email || !password) {
          setError('Todos os campos são obrigatórios')
          setLoading(false)
          return
        }

        if (username.length < 3) {
          setError('Username deve ter no mínimo 3 caracteres')
          setLoading(false)
          return
        }

        if (password.length < 6) {
          setError('Senha deve ter no mínimo 6 caracteres')
          setLoading(false)
          return
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          setError('Email inválido')
          setLoading(false)
          return
        }

        await register(username, email, password)
      }
      router.push('/')
    } catch (err: any) {
      console.error('Auth error:', err)
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="w-full max-w-md">
        {/* Backend Status Warning */}
        {backendStatus === 'offline' && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <div className="flex items-center gap-2 text-red-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold">Backend não está rodando</p>
                <p className="text-sm text-red-300">
                  Execute <code className="bg-red-900/50 px-1 rounded">npm run dev:backend</code> em outro terminal
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">VoxelPromo</h1>
          <p className="text-white/90 text-lg font-medium">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                <span className="text-sm text-red-800 font-medium">{error}</span>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                  placeholder="Seu username"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {isLogin ? 'Entrando...' : 'Criando conta...'}
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      Entrar
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Criar Conta
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-gray-600 hover:text-purple-600 text-sm transition-colors font-medium"
            >
              {isLogin ? (
                <>Não tem conta? <span className="text-purple-600 font-bold">Criar conta</span></>
              ) : (
                <>Já tem conta? <span className="text-purple-600 font-bold">Fazer login</span></>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white/80 text-sm">
          <p>Sistema de Monitoramento de Ofertas</p>
        </div>
      </div>
    </div>
  )
}

