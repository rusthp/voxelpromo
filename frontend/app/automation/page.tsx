'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { TimeRangePicker } from '@/components/TimeRangePicker'
import { PeakHoursEditor, PeakHour } from '@/components/PeakHoursEditor'
import {
    Settings,
    Save,
    Play,
    Pause,
    TestTube,
    ArrowLeft,
    Clock,
    Filter,
    Zap,
    MessageSquare,
    Loader,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showSuccess, showError, showInfo } from '@/lib/toast'

function AutomationContent() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [status, setStatus] = useState<any>(null)
    const [templates, setTemplates] = useState<any[]>([])

    const [config, setConfig] = useState<any>({
        isActive: false,
        startHour: 8,
        endHour: 1,
        intervalMinutes: 30,
        peakHours: [
            { start: 12, end: 14, priority: 7 },
            { start: 19, end: 22, priority: 8 },
        ],
        enabledSources: ['amazon', 'aliexpress', 'mercadolivre', 'shopee'],
        enabledCategories: [],
        productTypes: [],
        minDiscount: 20,
        maxPrice: 0,
        prioritizeBestSellersInPeak: true,
        prioritizeBigDiscountsInPeak: true,
        discountWeightVsSales: 50,
        enabledChannels: ['telegram'],
        messageTemplateId: null,
    })

    useEffect(() => {
        loadConfig()
        loadTemplates()
        loadStatus()
        const interval = setInterval(loadStatus, 30000) // Update status every 30s
        return () => clearInterval(interval)
    }, [])

    const loadConfig = async () => {
        try {
            setLoading(true)
            const response = await api.get('/automation/config')
            if (response.data) {
                setConfig(response.data)
            }
        } catch (error: any) {
            if (error.response?.status !== 404) {
                console.error('Error loading config:', error)
            }
        } finally {
            setLoading(false)
        }
    }

    const loadTemplates = async () => {
        try {
            const response = await api.get('/templates?activeOnly=true')
            setTemplates(response.data || [])
        } catch (error) {
            console.error('Error loading templates:', error)
        }
    }

    const loadStatus = async () => {
        try {
            const response = await api.get('/automation/status')
            setStatus(response.data)
        } catch (error) {
            console.error('Error loading status:', error)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            await api.post('/automation/config', config)
            showSuccess('✅ Configuração salva com sucesso!')
            await loadStatus()
        } catch (error: any) {
            console.error('Error saving config:', error)
            showError(`❌ Erro ao salvar: ${error.response?.data?.error || error.message}`)
        } finally {
            setSaving(false)
        }
    }

    const handleStart = async () => {
        try {
            await api.post('/automation/start')
            showSuccess('✅ Automação iniciada!')
            await loadConfig()
            await loadStatus()
        } catch (error: any) {
            console.error('Error starting automation:', error)
            showError(`❌ Erro ao iniciar: ${error.response?.data?.error || error.message}`)
        }
    }

    const handleStop = async () => {
        try {
            await api.post('/automation/stop')
            showInfo('⏸️ Automação pausada!')
            await loadConfig()
            await loadStatus()
        } catch (error: any) {
            console.error('Error stopping automation:', error)
            showError(`❌ Erro ao pausar: ${error.response?.data?.error || error.message}`)
        }
    }

    const handleTest = async () => {
        try {
            setTesting(true)
            const response = await api.post('/automation/test')
            const data = response.data

            let message = '🧪 Preview das Próximas Postagens:\n\n'
            if (data.nextOffers && data.nextOffers.length > 0) {
                data.nextOffers.forEach((offer: any, i: number) => {
                    message += `${i + 1}. ${offer.title.substring(0, 50)}...\n`
                    message += `   💰 R$ ${offer.price.toFixed(2)} | 📉 ${offer.discount.toFixed(0)}% OFF | 🏪 ${offer.source}\n\n`
                })
            } else {
                message += 'Nenhuma oferta disponível no momento.\n'
            }

            showInfo(message)
        } catch (error: any) {
            console.error('Error testing automation:', error)
            showError(`❌ Erro ao testar: ${error.response?.data?.error || error.message}`)
        } finally {
            setTesting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <main className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Settings className="w-8 h-8 text-purple-600" />
                            <h1 className="text-4xl font-bold text-gray-800">Automação de Postagens</h1>
                        </div>
                        <Link
                            href="/"
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Voltar
                        </Link>
                    </div>
                    <p className="text-gray-600">
                        Configure postagens automáticas inteligentes com priorização por horários de pico
                    </p>
                </div>

                {/* Status */}
                {status && (
                    <div
                        className={`glass rounded-xl p-6 mb-6 border-2 ${config.isActive ? 'border-green-300 bg-green-50' : 'border-gray-300'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {config.isActive ? (
                                    <>
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                        <div>
                                            <p className="font-semibold text-green-800">Automação Ativa</p>
                                            {status.shouldPost ? (
                                                <p className="text-sm text-green-600">
                                                    ✅ Dentro do horário de postagem (Hora atual: {status.currentHour}h)
                                                </p>
                                            ) : (
                                                <p className="text-sm text-yellow-600">
                                                    ⏰ Fora do horário de postagem (Hora atual: {status.currentHour}h)
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-6 h-6 text-gray-600" />
                                        <div>
                                            <p className="font-semibold text-gray-800">Automação Pausada</p>
                                            <p className="text-sm text-gray-600">Clique em "Iniciar" para ativar</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {config.isActive ? (
                                    <button
                                        onClick={handleStop}
                                        className="px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 font-semibold flex items-center gap-2"
                                    >
                                        <Pause className="w-5 h-5" />
                                        Pausar
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleStart}
                                        className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-semibold flex items-center gap-2"
                                    >
                                        <Play className="w-5 h-5" />
                                        Iniciar
                                    </button>
                                )}
                                <button
                                    onClick={handleTest}
                                    disabled={testing}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    <TestTube className="w-5 h-5" />
                                    {testing ? 'Testando...' : 'Testar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Configuration */}
                <div className="space-y-6">
                    {/* 1. Horários */}
                    <div className="glass rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Clock className="w-6 h-6 text-purple-600" />
                            Horários
                        </h2>
                        <div className="space-y-4">
                            <TimeRangePicker
                                startHour={config.startHour}
                                endHour={config.endHour}
                                onChange={(start, end) => setConfig({ ...config, startHour: start, endHour: end })}
                                label="Período de Postagens"
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Intervalo entre postagens (minutos)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="1440"
                                    value={config.intervalMinutes}
                                    onChange={(e) =>
                                        setConfig({ ...config, intervalMinutes: parseInt(e.target.value) || 30 })
                                    }
                                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Recomendado: 30-60 minutos para não saturar os grupos
                                </p>
                            </div>

                            <PeakHoursEditor
                                peakHours={config.peakHours}
                                onChange={(peakHours) => setConfig({ ...config, peakHours })}
                            />
                        </div>
                    </div>

                    {/* 2. Filtros */}
                    <div className="glass rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Filter className="w-6 h-6 text-purple-600" />
                            Filtros de Produtos
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Lojas / Fontes
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {['amazon', 'aliexpress', 'mercadolivre', 'shopee'].map((source) => (
                                        <label key={source} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={config.enabledSources.includes(source)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setConfig({
                                                            ...config,
                                                            enabledSources: [...config.enabledSources, source],
                                                        })
                                                    } else {
                                                        setConfig({
                                                            ...config,
                                                            enabledSources: config.enabledSources.filter((s: string) => s !== source),
                                                        })
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-sm capitalize">{source}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Desconto Mínimo (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={config.minDiscount}
                                        onChange={(e) =>
                                            setConfig({ ...config, minDiscount: parseInt(e.target.value) || 0 })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Preço Máximo (R$) - 0 = ilimitado
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={config.maxPrice}
                                        onChange={(e) =>
                                            setConfig({ ...config, maxPrice: parseFloat(e.target.value) || 0 })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Priorização */}
                    <div className="glass rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Zap className="w-6 h-6 text-purple-600" />
                            Priorização Inteligente
                        </h2>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.prioritizeBestSellersInPeak}
                                    onChange={(e) =>
                                        setConfig({ ...config, prioritizeBestSellersInPeak: e.target.checked })
                                    }
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Priorizar produtos mais vendidos em horários de pico
                                </span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.prioritizeBigDiscountsInPeak}
                                    onChange={(e) =>
                                        setConfig({ ...config, prioritizeBigDiscountsInPeak: e.target.checked })
                                    }
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Priorizar grandes descontos em horários de pico
                                </span>
                            </label>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Peso: Desconto vs Vendas (0 = apenas vendas, 100 = apenas desconto)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={config.discountWeightVsSales}
                                        onChange={(e) =>
                                            setConfig({ ...config, discountWeightVsSales: parseInt(e.target.value) })
                                        }
                                        className="flex-1"
                                    />
                                    <span className="text-sm font-semibold text-purple-600 w-12 text-center">
                                        {config.discountWeightVsSales}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Vendas</span>
                                    <span>Desconto</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Canais */}
                    <div className="glass rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Canais de Postagem</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {['telegram', 'whatsapp', 'x'].map((channel) => (
                                <label key={channel} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.enabledChannels.includes(channel)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setConfig({
                                                    ...config,
                                                    enabledChannels: [...config.enabledChannels, channel],
                                                })
                                            } else {
                                                setConfig({
                                                    ...config,
                                                    enabledChannels: config.enabledChannels.filter((c: string) => c !== channel),
                                                })
                                            }
                                        }}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-medium capitalize">{channel === 'x' ? 'X (Twitter)' : channel}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 5. Template */}
                    <div className="glass rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <MessageSquare className="w-6 h-6 text-purple-600" />
                            Template de Mensagem
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Selecionar Template
                                </label>
                                <select
                                    value={config.messageTemplateId || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, messageTemplateId: e.target.value || null })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="">Template Padrão do Sistema</option>
                                    {templates.map((template) => (
                                        <option key={template._id} value={template._id}>
                                            {template.name} ({template.tone})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Link
                                href="/templates"
                                className="inline-block text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                                → Gerenciar Templates
                            </Link>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Salvando...' : 'Salvar Configuração'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}

export default function AutomationPage() {
    return (
        <ProtectedRoute>
            <AutomationContent />
        </ProtectedRoute>
    )
}
