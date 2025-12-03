'use client'

import { useState } from 'react'
import { X, MessageSquare, Send, Edit3, Save } from 'lucide-react'

interface Offer {
    _id: string
    title: string
    currentPrice: number
    originalPrice?: number
    discountPercentage?: number
    source: string
    category: string
    isPosted: boolean
    createdAt: string
    imageUrl?: string
    affiliateUrl?: string
    productUrl?: string
    rating?: number
    reviewsCount?: number
    scheduledAt?: string
}

interface PreviewModalProps {
    isOpen: boolean
    onClose: () => void
    offer: Offer | null
    generatedPost: string | null
    platform: 'telegram' | 'whatsapp' | 'x' | null
    onConfirm: (editedPost: string) => void
}

export function PostPreviewModal({
    isOpen,
    onClose,
    offer,
    generatedPost,
    platform,
    onConfirm,
}: PreviewModalProps) {
    const [editedPost, setEditedPost] = useState(generatedPost || '')
    const [isEditing, setIsEditing] = useState(false)

    if (!isOpen || !offer || !generatedPost || !platform) return null

    const handleConfirm = () => {
        onConfirm(isEditing ? editedPost : generatedPost)
        setIsEditing(false)
    }

    const getPlatformIcon = () => {
        switch (platform) {
            case 'telegram':
                return <Send className="w-5 h-5" />
            case 'whatsapp':
                return <MessageSquare className="w-5 h-5" />
            case 'x':
                return <MessageSquare className="w-5 h-5" />
            default:
                return <MessageSquare className="w-5 h-5" />
        }
    }

    const getPlatformName = () => {
        switch (platform) {
            case 'telegram':
                return 'Telegram'
            case 'whatsapp':
                return 'WhatsApp'
            case 'x':
                return 'X (Twitter)'
            default:
                return platform
        }
    }

    const renderPreview = () => {
        const textToRender = isEditing ? editedPost : generatedPost

        switch (platform) {
            case 'telegram':
                return (
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                VP
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">VoxelPromo Bot</p>
                                <p className="text-xs text-gray-500">{new Date().toLocaleTimeString('pt-BR')}</p>
                            </div>
                        </div>
                        {offer.imageUrl && (
                            <img
                                src={offer.imageUrl}
                                alt={offer.title}
                                className="w-full rounded-lg mb-3 max-h-64 object-cover"
                            />
                        )}
                        <div
                            className="prose prose-sm max-w-none text-gray-800"
                            dangerouslySetInnerHTML={{
                                __html: textToRender.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>'),
                            }}
                        />
                    </div>
                )
            case 'whatsapp':
                return (
                    <div className="bg-[#dcf8c6] rounded-lg p-3 shadow-sm relative">
                        <div className="absolute top-0 left-0 w-0 h-0 border-t-[12px] border-t-[#dcf8c6] border-r-[12px] border-r-transparent"></div>
                        {offer.imageUrl && (
                            <img
                                src={offer.imageUrl}
                                alt={offer.title}
                                className="w-full rounded-lg mb-2 max-h-64 object-cover"
                            />
                        )}
                        <pre className="text-sm text-gray-800 font-sans whitespace-pre-wrap">{textToRender}</pre>
                        <p className="text-xs text-gray-500 text-right mt-2">
                            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                )
            case 'x':
                return (
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                VP
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900">VoxelPromo</span>
                                    <span className="text-gray-500">@voxelpromo · agora</span>
                                </div>
                                <pre className="text-[15px] text-gray-900 font-sans whitespace-pre-wrap leading-5">
                                    {textToRender}
                                </pre>
                                {offer.imageUrl && (
                                    <img
                                        src={offer.imageUrl}
                                        alt={offer.title}
                                        className="w-full rounded-2xl mt-3 border border-gray-200 max-h-[512px] object-cover"
                                    />
                                )}
                                <div className="flex items-center gap-16 mt-3 text-gray-500 text-sm">
                                    <button className="hover:text-blue-500 transition-colors">💬</button>
                                    <button className="hover:text-green-500 transition-colors">🔁</button>
                                    <button className="hover:text-red-500 transition-colors">❤️</button>
                                    <button className="hover:text-blue-500 transition-colors">📊</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            default:
                return <p className="text-gray-600">{textToRender}</p>
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            {getPlatformIcon()}
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Preview do Post</h2>
                                <p className="text-sm text-gray-600">{getPlatformName()}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {isEditing ? (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700">
                                    Edite o conteúdo do post:
                                </label>
                                <textarea
                                    value={editedPost}
                                    onChange={(e) => setEditedPost(e.target.value)}
                                    rows={12}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                                    placeholder="Digite o conteúdo do post..."
                                />
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>Caracteres: {editedPost.length}</span>
                                    {platform === 'x' && editedPost.length > 280 && (
                                        <span className="text-red-600 font-semibold">
                                            (Limite do X: 280 caracteres)
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Como ficará o post:</h3>
                                <div className="mb-4">{renderPreview()}</div>
                            </>
                        )}

                        {/* Offer Details */}
                        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-2">Detalhes da Oferta:</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">Produto:</span>
                                    <p className="font-medium text-gray-800 truncate">{offer.title}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Fonte:</span>
                                    <p className="font-medium text-gray-800 capitalize">{offer.source}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Preço Atual:</span>
                                    <p className="font-medium text-green-600">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(offer.currentPrice || 0)}
                                    </p>
                                </div>
                                {offer.originalPrice && (
                                    <div>
                                        <span className="text-gray-600">Preço Original:</span>
                                        <p className="font-medium text-gray-500 line-through">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(offer.originalPrice)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
                        <div className="flex gap-2">
                            {!isEditing ? (
                                <button
                                    onClick={() => {
                                        setEditedPost(generatedPost)
                                        setIsEditing(true)
                                    }}
                                    className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Editar
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                                >
                                    Cancelar Edição
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                        <button
                            onClick={handleConfirm}
                            className="px-8 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                        >
                            {isEditing ? <Save className="w-5 h-5" /> : getPlatformIcon()}
                            {isEditing ? 'Salvar e Publicar' : 'Confirmar e Publicar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
