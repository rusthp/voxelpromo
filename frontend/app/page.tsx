'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/StatsCard'
import { OffersListWithFilters } from '@/components/OffersListWithFilters'
import { CollectButton } from '@/components/CollectButton'
import { Logo } from '@/components/Logo'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { TrendingUp, Package, Send, Percent, Settings, LogOut, User } from 'lucide-react'
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
        api.get('/offers') // Removed limit to show all offers
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
              href="/settings"
              className="glass px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-gray-800 font-semibold"
            >
              <Settings className="w-5 h-5" />
              Configurações
            </Link>
          </div>
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
            <OffersListWithFilters offers={offers} onUpdate={loadData} />
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
