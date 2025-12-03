'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { TemplateEditor } from '@/components/TemplateEditor'
import {
    MessageSquare,
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    ArrowLeft,
    Eye,
    Loader,
    TestTube,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showSuccess, showError, showWarning, showInfo } from '@/lib/toast'

function TemplatesContent() {
    const router = useRouter()
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState<any>(null)
    const [creating, setCreating] = useState(false)
    const [previewOffer, setPreviewOffer] = useState<any>(null)

    const [formData, setFormData] = useState({
        name: '',
        tone: 'casual' as 'casual' | 'professional' | 'urgent' | 'viral',
        content: '',
        isActive: true,
        isDefault: false,
    })

    useEffect(() => {
        loadTemplates()
        loadPreviewOffer()
    }, [])

    const loadTemplates = async () => {
        try {
            setLoading(true)
            const response = await api.get('/templates')
            setTemplates(response.data || [])
        } catch (error) {
            console.error('Error loading templates:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadPreviewOffer = async () => {
        try {
            const response = await api.get('/offers?limit=1')
            if (response.data && response.data.length > 0) {
                setPreviewOffer(response.data[0])
            }
        } catch (error) {
            console.error('Error loading preview offer:', error)
        }
    }

    const handleCreate = () => {
        setCreating(true)
        setFormData({
            name: '',
            tone: 'casual',
            content: '🔥 OFERTA IMPERDÍVEL! 🔥\n\n{title}\n\n💰 De {originalPrice} por {price}\n📉 {discountPercent} OFF\n\n🛒 Compre agora: {url}',
            isActive: true,
            isDefault: false,
        })
    }

    const handleEdit = (template: any) => {
        setEditing(template)
        setFormData({
            name: template.name,
            tone: template.tone,
            content: template.content,
            isActive: template.isActive,
            isDefault: template.isDefault,
        })
    }

    const handleSave = async () => {
        try {
            if (!formData.name || !formData.content) {
                showWarning('⚠️ Nome e conteúdo são obrigatórios')
                return
            }

            if (editing) {
                // Update
                await api.put(`/templates/${editing._id}`, formData)
                showSuccess('✅ Template atualizado com sucesso!')
            } else {
                // Create
                await api.post('/templates', formData)
                showSuccess('✅ Template criado com sucesso!')
            }

            setEditing(null)
            setCreating(false)
            await loadTemplates()
        } catch (error: any) {
            console.error('Error saving template:', error)
            showError(`❌ Erro ao salvar: ${error.response?.data?.error || error.message}`)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o template "${name}"?`)) {
            return
        }

        try {
            await api.delete(`/templates/${id}`)
            showSuccess('✅ Template excluído com sucesso!')
            await loadTemplates()
        } catch (error: any) {
            console.error('Error deleting template:', error)
            showError(`❌ Erro ao excluir: ${error.response?.data?.error || error.message}`)
        }
    }

    const handleTest = async (template: any) => {
        try {
            const response = await api.post(`/templates/${template._id}/test`)
            const rendered = response.data.rendered

            showInfo(`🧪 Preview do Template:\n\n${rendered}`)
        } catch (error: any) {
            console.error('Error testing template:', error)
            showError(`❌ Erro ao testar: ${error.response?.data?.error || error.message}`)
        }
    }

    const handleCancel = () => {
        setEditing(null)
        setCreating(false)
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
                            <MessageSquare className="w-8 h-8 text-purple-600" />
                            <h1 className="text-4xl font-bold text-gray-800">Templates de Mensagens</h1>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                href="/automation"
                                className="px-6 py-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                            >
                                Automação
                            </Link>
                            <Link
                                href="/"
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Voltar
                            </Link>
                        </div>
                    </div>
                    <p className="text-gray-600">Crie e gerencie templates personalizados para suas postagens</p>
                </div>

                {/* Editor/Creator */}
                {(editing || creating) && (
                    <div className="glass rounded-xl p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {editing ? 'Editar Template' : 'Novo Template'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Template</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Promoção Urgente"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>

                            <TemplateEditor
                                content={formData.content}
                                onChange={(content) => setFormData({ ...formData, content })}
                                tone={formData.tone}
                                onToneChange={(tone) => setFormData({ ...formData, tone })}
                                previewOffer={previewOffer}
                            />

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Template Ativo</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Template Padrão</span>
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    Salvar Template
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold flex items-center gap-2"
                                >
                                    <X className="w-5 h-5" />
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Templates List */}
                {!editing && !creating && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Meus Templates</h2>
                            <button
                                onClick={handleCreate}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Novo Template
                            </button>
                        </div>

                        {templates.length === 0 ? (
                            <div className="glass rounded-xl p-12 text-center">
                                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg mb-4">Nenhum template criado ainda</p>
                                <button
                                    onClick={handleCreate}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold inline-flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Criar Primeiro Template
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {templates.map((template) => (
                                    <div
                                        key={template._id}
                                        className={`glass rounded-xl p-6 border-2 ${template.isDefault
                                            ? 'border-purple-300 bg-purple-50'
                                            : 'border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold text-gray-800">{template.name}</h3>
                                                    {template.isDefault && (
                                                        <span className="px-3 py-1 bg-purple-200 text-purple-800 text-xs font-semibold rounded-full">
                                                            PADRÃO
                                                        </span>
                                                    )}
                                                    {!template.isActive && (
                                                        <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">
                                                            INATIVO
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    Tom: <span className="font-medium capitalize">{template.tone}</span>
                                                    {template.timesUsed > 0 && (
                                                        <span className="ml-4">
                                                            Usado {template.timesUsed} {template.timesUsed === 1 ? 'vez' : 'vezes'}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleTest(template)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Testar template"
                                                >
                                                    <TestTube className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(template)}
                                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(template._id, template.name)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                                {template.content.substring(0, 300)}
                                                {template.content.length > 300 && '...'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}

export default function TemplatesPage() {
    return (
        <ProtectedRoute>
            <TemplatesContent />
        </ProtectedRoute>
    )
}
