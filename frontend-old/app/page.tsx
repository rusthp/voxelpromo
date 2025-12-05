'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/StatsCard'
import { OffersListWithFilters } from '@/components/OffersListWithFilters'
import { CollectButton } from '@/components/CollectButton'
import { Logo } from '@/components/Logo'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HealthWidget } from '@/components/HealthWidget'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { TrendingUp, Package, Send, Percent, Settings, LogOut, User, BarChart3, Shield } from 'lucide-react'
import Link from 'next/link'

function HomeContent() {
  const [stats, setStats] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsData, offersData] = await Promise.all([
        api.get('/stats'),
        api.get('/offers?limit=100') // Load only 100 offers for better performance
      ])
      setStats(statsData.data)
      setOffers(offersData.data)
      console.log(`[Frontend] Loaded ${offersData.data.length} offers (Total stats: ${statsData.data.total})`)
    } catch (error: any) {
      console.error('Error loading data:', error)

      // Show user-friendly error messages
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.error('❌ Backend não está acessível. Verifique se está rodando na porta 3000.')
      } else if (error.response?.status === 401) {
        console.error('❌ Não autenticado. Faça login novamente.')
      } else if (error.response?.status === 500) {
        console.error('❌ Erro no servidor. Verifique os logs do backend.')
      } else {
        console.error('❌ Erro ao carregar dados:', error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
            <Logo size="xl" showText={true} className="mb-2" />
            <p className="text-xl text-white/90 font-medium text-center md:text-left">
              Sistema de Monitoramento de Ofertas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UserInfo />
            <Link
              href="/analytics"
              className="glass px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-gray-800 font-semibold"
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </Link>
            <Link
              href="/history"
              className="glass px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-gray-800 font-semibold"
            >
              <Package className="w-5 h-5" />
              Histórico
            </Link>
            <Link
              href="/blacklist"
              className="glass px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-gray-800 font-semibold"
            >
              <Shield className="w-5 h-5" />
              Blacklist
            </Link>
            <Link
              href="/automation"
              className="glass px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-gray-800 font-semibold bg-gradient-to-r from-purple-50 to-blue-50"
            >
              <Settings className="w-5 h-5 text-purple-600" />
              Automação
            </Link>
            <Link
              href="/settings"
              className="glass px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-gray-800 font-semibold"
            >
              <Settings className="w-5 h-5" />
              Configurações
            </Link>
          </div>
        </div>

        {/* Health Widget */}
        <div className="mb-8">
          <HealthWidget />
        </div>

        {/* Collect Button */}
        <div className="mb-8">
          <CollectButton onCollect={loadData} />
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total de Ofertas"
              value={stats.total || 0}
              icon={<Package className="w-6 h-6" />}
              color="blue"
            />
            <StatsCard
              title="Publicadas"
              value={stats.posted || 0}
              icon={<Send className="w-6 h-6" />}
              color="green"
            />
            <StatsCard
              title="Não Publicadas"
              value={stats.notPosted || 0}
              icon={<TrendingUp className="w-6 h-6" />}
              color="orange"
            />
            <StatsCard
              title="Desconto Médio"
              value={stats.avgDiscount && stats.avgDiscount > 0 ? `${Number(stats.avgDiscount).toFixed(1)}%` : '0.0%'}
              icon={<Percent className="w-6 h-6" />}
              color="purple"
            />
          </div>
        )}

        {/* Offers Section */}
        <div className="glass rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-600" />
              Ofertas Recentes
            </h2>
            {!loading && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {offers.length} {offers.length === 1 ? 'oferta' : 'ofertas'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Carregando ofertas...</p>
            </div>
          ) : (
            <>
              <OffersListWithFilters offers={offers} onUpdate={loadData} />
              {stats && offers.length < stats.total && (
                <div className="mt-6 text-center">
                  <p className="text-gray-600 mb-4">
                    Mostrando {offers.length} de {stats.total} ofertas
                  </p>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Recarregar para Ver Mais
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}

function UserInfo() {
  const { user, logout } = useAuth()

  return (
    <div className="flex items-center gap-3 glass px-4 py-2 rounded-xl">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-gray-700" />
        <span className="text-sm text-gray-700 font-medium">{user?.username}</span>
      </div>
      <button
        onClick={logout}
        className="text-gray-600 hover:text-red-600 transition-colors"
        title="Sair"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  )
}
