'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { api } from '@/lib/api'
import { Shield, Plus, X, TestTube, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { showSuccess, showError, showWarning } from '@/lib/toast'

interface BlacklistPattern {
    pattern: string
    description?: string
}

export default function BlacklistPage() {
    return (
        <ProtectedRoute>
            <BlacklistContent />
        </ProtectedRoute>
    )
}

function BlacklistContent() {
    const [patterns, setPatterns] = useState<BlacklistPattern[]>([])
    const [newPattern, setNewPattern] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [testText, setTestText] = useState('')
    const [testResults, setTestResults] = useState<{ pattern: string; matches: boolean }[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadBlacklist()
    }, [])

    const loadBlacklist = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/config')
            setPatterns(data.blacklist?.patterns || [])
        } catch (error) {
            console.error('Error loading blacklist:', error)
        } finally {
            setLoading(false)
        }
    }

    const addPattern = async () => {
        if (!newPattern.trim()) return

        try {
            // Test if pattern is valid regex
            new RegExp(newPattern)
        } catch (error) {
            showWarning('⚠️ Padrão regex inválido! Verifique a sintaxe.')
            return
        }

        const updatedPatterns = [
            ...patterns,
            { pattern: newPattern, description: newDescription || undefined },
        ]

        try {
            setSaving(true)
            await api.put('/config', {
                blacklist: {
                    enabled: true,
                    patterns: updatedPatterns,
                },
            })
            setPatterns(updatedPatterns)
            setNewPattern('')
            setNewDescription('')
            showSuccess('✅ Padrão adicionado com sucesso!')
        } catch (error: any) {
            console.error('Error adding pattern:', error)
            showError('❌ Erro ao adicionar padrão: ' + error.response?.data?.error || error.message)
        } finally {
            setSaving(false)
        }
    }

    const removePattern = async (index: number) => {
        if (!confirm('Tem certeza que deseja remover este padrão?')) return

        const updatedPatterns = patterns.filter((_, i) => i !== index)

        try {
            setSaving(true)
            await api.put('/config', {
                blacklist: {
                    enabled: updatedPatterns.length > 0,
                    patterns: updatedPatterns,
                },
            })
            setPatterns(updatedPatterns)
            showSuccess('✅ Padrão removido com sucesso!')
        } catch (error: any) {
            console.error('Error removing pattern:', error)
            showError('❌ Erro ao remover padrão: ' + error.response?.data?.error || error.message)
        } finally {
            setSaving(false)
        }
    }

    const testPatterns = () => {
        if (!testText.trim()) {
            setTestResults([])
            return
        }

        const results = patterns.map((p) => {
            try {
                const regex = new RegExp(p.pattern, 'i')
                const matches = regex.test(testText)
                return { pattern: p.pattern, matches }
            } catch (error) {
                return { pattern: p.pattern, matches: false }
            }
        })

        setTestResults(results)
    }

    const isBlacklisted = testResults.some((r) => r.matches)

    return (
        <main className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
                        ← Voltar ao Dashboard
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-10 h-10 text-purple-600" />
                        <h1 className="text-4xl font-bold text-gray-800">Gerenciar Blacklist</h1>
                    </div>
                    <p className="text-gray-600">
                        Configure padrões regex para filtrar ofertas indesejadas automaticamente
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Add Pattern Section */}
                    <div className="glass rounded-xl border-2 border-gray-100 p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Plus className="w-6 h-6" />
                            Adicionar Padrão
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Padrão Regex
                                </label>
                                <input
                                    type="text"
                                    value={newPattern}
                                    onChange={(e) => setNewPattern(e.target.value)}
                                    placeholder="Ex: .*(test|demo|fake).*"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Use regex para criar padrões flexíveis. Exemplo: <code>.*(grátis|free).*</code>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descrição (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Ex: Filtrar produtos de teste"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <button
                                onClick={addPattern}
                                disabled={!newPattern.trim() || saving}
                                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                {saving ? 'Salvando...' : 'Adicionar Padrão'}
                            </button>
                        </div>
                    </div>

                    {/* Test Pattern Section */}
                    <div className="glass rounded-xl border-2 border-gray-100 p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <TestTube className="w-6 h-6" />
                            Testar Padrões
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Texto de Teste
                                </label>
                                <textarea
                                    value={testText}
                                    onChange={(e) => {
                                        setTestText(e.target.value)
                                        testPatterns()
                                    }}
                                    placeholder="Digite um texto para testar contra os padrões..."
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            {testText && (
                                <div
                                    className={`p-4 rounded-lg border-2 ${isBlacklisted
                                        ? 'bg-red-50 border-red-300'
                                        : 'bg-green-50 border-green-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        {isBlacklisted ? (
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                        ) : (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        )}
                                        <span className="font-semibold text-gray-800">
                                            {isBlacklisted ? '❌ Seria Bloqueado' : '✅ Passaria'}
                                        </span>
                                    </div>
                                    {testResults.length > 0 && (
                                        <div className="text-sm space-y-1 mt-3">
                                            {testResults.map((result, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    {result.matches ? (
                                                        <span className="text-red-600">✗</span>
                                                    ) : (
                                                        <span className="text-gray-400">○</span>
                                                    )}
                                                    <code className="text-xs bg-white px-2 py-1 rounded">
                                                        {result.pattern}
                                                    </code>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Patterns List */}
                <div className="glass rounded-xl border-2 border-gray-100 p-6 mt-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        Padrões Ativos ({patterns.length})
                    </h2>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        </div>
                    ) : patterns.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>Nenhum padrão configurado</p>
                            <p className="text-sm">Adicione padrões para começar a filtrar ofertas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {patterns.map((pattern, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                                >
                                    <div className="flex-1">
                                        <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
                                            {pattern.pattern}
                                        </code>
                                        {pattern.description && (
                                            <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removePattern(index)}
                                        disabled={saving}
                                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Remover padrão"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <h3 className="font-bold text-blue-900 mb-2">💡 Dicas de Uso</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Use <code className="bg-blue-100 px-1 rounded">.*</code> para corresponder qualquer caractere</li>
                        <li>• Use <code className="bg-blue-100 px-1 rounded">|</code> para OU lógico (ex: grátis|free)</li>
                        <li>• Padrões não são case-sensitive (ignoram maiúsculas/minúsculas)</li>
                        <li>• Teste seus padrões antes de adicionar para evitar bloqueios indesejados</li>
                        <li>• Ofertas bloqueadas não aparecem na lista principal</li>
                    </ul>
                </div>
            </div>
        </main>
    )
}
