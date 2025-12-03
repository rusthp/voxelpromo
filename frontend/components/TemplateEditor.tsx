'use client'

import { useState, useEffect } from 'react'
import { Eye, Sparkles } from 'lucide-react'

interface TemplateEditorProps {
    content: string
    onChange: (content: string) => void
    tone: 'casual' | 'professional' | 'urgent' | 'viral'
    onToneChange: (tone: 'casual' | 'professional' | 'urgent' | 'viral') => void
    previewOffer?: any
}

const VARIABLES = [
    { var: '{title}', desc: 'Título do produto', example: 'iPhone 13 Pro Max 256GB' },
    { var: '{price}', desc: 'Preço atual', example: 'R$ 4.999,00' },
    { var: '{originalPrice}', desc: 'Preço original', example: 'R$ 6.999,00' },
    { var: '{discount}', desc: 'Valor do desconto', example: 'R$ 2.000,00' },
    { var: '{discountPercent}', desc: 'Desconto %', example: '28%' },
    { var: '{url}', desc: 'URL', example: 'https://...' },
    { var: '{source}', desc: 'Loja', example: 'Amazon' },
    { var: '{category}', desc: 'Categoria', example: 'Eletrônicos' },
    { var: '{rating}', desc: 'Avaliação', example: '⭐ 4.5' },
    { var: '{reviews}', desc: 'Avaliações', example: '(1234 avaliações)' },
]

export function TemplateEditor({ content, onChange, tone, onToneChange, previewOffer }: TemplateEditorProps) {
    const [preview, setPreview] = useState('')
    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        if (previewOffer && content) {
            // Render preview
            let rendered = content
            rendered = rendered.replace(/{title}/g, previewOffer.title || 'Produto Exemplo')
            rendered = rendered.replace(/{price}/g, `R$ ${(previewOffer.currentPrice || 99.99).toFixed(2)}`)
            rendered = rendered.replace(/{originalPrice}/g, `R$ ${(previewOffer.originalPrice || 149.99).toFixed(2)}`)
            rendered = rendered.replace(/{discount}/g, `R$ ${(previewOffer.discount || 50).toFixed(2)}`)
            rendered = rendered.replace(/{discountPercent}/g, `${(previewOffer.discountPercentage || 33).toFixed(0)}%`)
            rendered = rendered.replace(/{url}/g, previewOffer.productUrl || 'https://exemplo.com')
            rendered = rendered.replace(/{source}/g, previewOffer.source || 'Amazon')
            rendered = rendered.replace(/{category}/g, previewOffer.category || 'Eletrônicos')
            rendered = rendered.replace(/{rating}/g, previewOffer.rating ? `⭐ ${previewOffer.rating.toFixed(1)}` : '')
            rendered = rendered.replace(/{reviews}/g, previewOffer.reviewsCount ? `(${previewOffer.reviewsCount} avaliações)` : '')
            setPreview(rendered)
        }
    }, [content, previewOffer])

    const insertVariable = (variable: string) => {
        onChange(content + ' ' + variable)
    }

    return (
        <div className="space-y-4">
            {/* Tone selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tom da Mensagem</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['casual', 'professional', 'urgent', 'viral'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => onToneChange(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tone === t
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {t === 'casual' && '😊 Casual'}
                            {t === 'professional' && '💼 Profissional'}
                            {t === 'urgent' && '⚡ Urgente'}
                            {t === 'viral' && '🔥 Viral'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Variables helper */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Variáveis Disponíveis (clique para inserir)
                </p>
                <div className="flex flex-wrap gap-2">
                    {VARIABLES.map((v) => (
                        <button
                            key={v.var}
                            onClick={() => insertVariable(v.var)}
                            className="px-3 py-1 bg-white border border-blue-300 rounded-lg text-xs text-blue-700 hover:bg-blue-50 transition-colors"
                            title={`${v.desc} - Exemplo: ${v.example}`}
                        >
                            {v.var}
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo do Template</label>
                <textarea
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                    placeholder="Digite sua mensagem aqui... Use as variáveis acima para personalizar."
                />
                <p className="text-xs text-gray-500 mt-1">{content.length} caracteres</p>
            </div>

            {/* Preview toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium"
                >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
                </button>
            </div>

            {/* Preview */}
            {showPreview && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-purple-900 mb-2 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Preview da Mensagem
                    </p>
                    <div className="bg-white rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-800 border border-purple-100">
                        {preview || 'Adicione conteúdo e um produto de exemplo para ver o preview...'}
                    </div>
                </div>
            )}
        </div>
    )
}
