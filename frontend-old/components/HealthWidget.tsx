'use client'

import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface Source {
    name: string
    enabled: boolean
    status: string
    lastCollection: string | null
    offersCount: number
    errorMessage?: string
}

interface HealthData {
    status: string
    timestamp: string
    sources: Source[]
}

export function HealthWidget() {
    const [health, setHealth] = useState<HealthData | null>(null)
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        loadHealth()
        // Auto-refresh every 60 seconds
        const interval = setInterval(loadHealth, 60000)
        return () => clearInterval(interval)
    }, [])

    const loadHealth = async () => {
        try {
            const { data } = await api.get('/health/sources')
            setHealth(data)
        } catch (error) {
            console.error('Error loading health data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />
            default:
                return <Activity className="w-5 h-5 text-gray-400" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'bg-green-100 text-green-800 border-green-300'
            case 'degraded':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300'
            case 'unhealthy':
                return 'bg-red-100 text-red-800 border-red-300'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300'
        }
    }

    const getSourceColor = (name: string) => {
        const colors: { [key: string]: string } = {
            aliexpress: 'bg-red-100 text-red-800 border-red-300',
            shopee: 'bg-orange-100 text-orange-800 border-orange-300',
            amazon: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            rss: 'bg-blue-100 text-blue-800 border-blue-300',
            mercadolivre: 'bg-green-100 text-green-800 border-green-300',
        }
        return colors[name] || 'bg-gray-100 text-gray-800 border-gray-300'
    }

    if (loading) {
        return (
            <div className="glass rounded-xl border-2 border-gray-100 p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
        )
    }

    if (!health) return null

    return (
        <div className="glass rounded-xl border-2 border-gray-100 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-purple-600" />
                    <div className="text-left">
                        <h3 className="font-bold text-gray-800">Status do Sistema</h3>
                        <p className="text-sm text-gray-500">
                            {health.sources.filter(s => s.status === 'healthy').length} / {health.sources.length} fontes ativas
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(health.status)}`}>
                        {health.status === 'healthy' ? 'Saudável' : health.status === 'degraded' ? 'Degradado' : 'Crítico'}
                    </span>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {expanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50/30">
                    <div className="space-y-3">
                        {health.sources.map((source) => (
                            <div
                                key={source.name}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                            >
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(source.status)}
                                    <div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border capitalize ${getSourceColor(source.name)}`}>
                                            {source.name}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {source.lastCollection
                                                ? `Última coleta: ${new Date(source.lastCollection).toLocaleString('pt-BR')}`
                                                : 'Nunca coletado'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-800">{source.offersCount}</p>
                                    <p className="text-xs text-gray-500">ofertas (24h)</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-center">
                        Atualizado: {new Date(health.timestamp).toLocaleString('pt-BR')}
                    </p>
                </div>
            )}
        </div>
    )
}
