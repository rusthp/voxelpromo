'use client'

import { useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { Sparkles, Send, ExternalLink, Image as ImageIcon, Package, Trash2, CheckSquare, Square, Search, Filter, X } from 'lucide-react'

interface Offer {
  _id: string
  title: string
  currentPrice: number
  originalPrice: number
  discountPercentage: number
  source: string
  category: string
  isPosted: boolean
  createdAt: string
  imageUrl?: string
  affiliateUrl?: string
  rating?: number
  reviewsCount?: number
}

interface OffersListProps {
  offers: Offer[]
  onUpdate: () => void
}

export function OffersListWithFilters({ offers, onUpdate }: OffersListProps) {
  const [posting, setPosting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set())
  const [deletingMultiple, setDeletingMultiple] = useState(false)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'none' | 'source' | 'category'>('none')
  const [showFilters, setShowFilters] = useState(false)

  // Get unique sources and categories
  const sources = useMemo(() => {
    const unique = Array.from(new Set(offers.map(o => o.source)))
    return unique.sort()
  }, [offers])

  const categories = useMemo(() => {
    const unique = Array.from(new Set(offers.map(o => o.category)))
    return unique.sort()
  }, [offers])

  // Filter and group offers
  const filteredAndGroupedOffers = useMemo(() => {
    // Apply filters
    let filtered = offers.filter(offer => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!offer.title.toLowerCase().includes(query) &&
            !offer.category.toLowerCase().includes(query) &&
            !offer.source.toLowerCase().includes(query)) {
          return false
        }
      }

      // Source filter
      if (selectedSource !== 'all' && offer.source !== selectedSource) {
        return false
      }

      // Category filter
      if (selectedCategory !== 'all' && offer.category !== selectedCategory) {
        return false
      }

      return true
    })

    // Group offers
    if (groupBy === 'none') {
      return { 'all': filtered }
    } else if (groupBy === 'source') {
      const grouped: Record<string, Offer[]> = {}
      filtered.forEach(offer => {
        if (!grouped[offer.source]) {
          grouped[offer.source] = []
        }
        grouped[offer.source].push(offer)
      })
      return grouped
    } else if (groupBy === 'category') {
      const grouped: Record<string, Offer[]> = {}
      filtered.forEach(offer => {
        if (!grouped[offer.category]) {
          grouped[offer.category] = []
        }
        grouped[offer.category].push(offer)
      })
      return grouped
    }

    return { 'all': filtered }
  }, [offers, searchQuery, selectedSource, selectedCategory, groupBy])

  const handlePost = async (offerId: string) => {
    try {
      setPosting(offerId)
      await api.post(`/offers/${offerId}/post`, { channels: ['telegram', 'x'] })
      onUpdate()
    } catch (error) {
      console.error('Error posting offer:', error)
      alert('Erro ao publicar oferta')
    } finally {
      setPosting(null)
    }
  }

  const handleGeneratePost = async (offerId: string) => {
    try {
      setPosting(offerId)
      await api.post(`/offers/${offerId}/generate-post`, { tone: 'viral' })
      onUpdate()
    } catch (error) {
      console.error('Error generating post:', error)
      alert('Erro ao gerar post')
    } finally {
      setPosting(null)
    }
  }

  const handleDelete = async (offerId: string, permanent: boolean = true) => {
    if (!confirm(permanent 
      ? 'Tem certeza que deseja excluir permanentemente esta oferta? Esta ação não pode ser desfeita.' 
      : 'Tem certeza que deseja excluir esta oferta?')) {
      return
    }

    try {
      setDeleting(offerId)
      await api.delete(`/offers/${offerId}${permanent ? '?permanent=true' : ''}`)
      setSelectedOffers(prev => {
        const next = new Set(prev)
        next.delete(offerId)
        return next
      })
      onUpdate()
    } catch (error) {
      console.error('Error deleting offer:', error)
      alert('Erro ao excluir oferta')
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleSelect = (offerId: string) => {
    setSelectedOffers(prev => {
      const next = new Set(prev)
      if (next.has(offerId)) {
        next.delete(offerId)
      } else {
        next.add(offerId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const allFilteredIds = Object.values(filteredAndGroupedOffers)
      .flat()
      .map(o => o._id)
    
    if (selectedOffers.size === allFilteredIds.length && 
        allFilteredIds.every(id => selectedOffers.has(id))) {
      setSelectedOffers(new Set())
    } else {
      setSelectedOffers(new Set(allFilteredIds))
    }
  }

  const handleDeleteSelected = async (permanent: boolean = true) => {
    if (selectedOffers.size === 0) {
      alert('Nenhuma oferta selecionada')
      return
    }

    const message = permanent
      ? `Tem certeza que deseja excluir permanentemente ${selectedOffers.size} oferta(s)? Esta ação não pode ser desfeita.`
      : `Tem certeza que deseja excluir ${selectedOffers.size} oferta(s)?`

    if (!confirm(message)) {
      return
    }

    try {
      setDeletingMultiple(true)
      const ids = Array.from(selectedOffers)
      await api.delete('/offers', { data: { ids, permanent } })
      setSelectedOffers(new Set())
      onUpdate()
    } catch (error) {
      console.error('Error deleting offers:', error)
      alert('Erro ao excluir ofertas')
    } finally {
      setDeletingMultiple(false)
    }
  }

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      amazon: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      aliexpress: 'bg-red-100 text-red-800 border-red-300',
      shopee: 'bg-orange-100 text-orange-800 border-orange-300',
      rss: 'bg-blue-100 text-blue-800 border-blue-300',
      manual: 'bg-gray-100 text-gray-800 border-gray-300',
      mercadolivre: 'bg-blue-100 text-blue-800 border-blue-300'
    }
    return colors[source] || colors.manual
  }

  const totalFiltered = Object.values(filteredAndGroupedOffers).flat().length

  if (offers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
          <Package className="w-12 h-12 text-gray-400" />
        </div>
        <p className="text-xl text-gray-500 font-medium mb-2">Nenhuma oferta encontrada</p>
        <p className="text-sm text-gray-400">Clique em "Coletar Ofertas Agora" para começar</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border-2 border-gray-100 p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, categoria ou loja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showFilters 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loja/Fonte
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todas as lojas</option>
                {sources.map(source => (
                  <option key={source} value={source}>
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todas as categorias</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Group By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agrupar por
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'none' | 'source' | 'category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="none">Sem agrupamento</option>
                <option value="source">Por Loja</option>
                <option value="category">Por Categoria</option>
              </select>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Mostrando <strong>{totalFiltered}</strong> de <strong>{offers.length}</strong> ofertas
            {searchQuery && ` para "${searchQuery}"`}
          </p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {totalFiltered > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {Object.values(filteredAndGroupedOffers).flat().every(o => selectedOffers.has(o._id)) ? (
                <CheckSquare className="w-5 h-5 text-purple-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-600" />
              )}
              <span className="font-medium text-gray-700">
                {Object.values(filteredAndGroupedOffers).flat().every(o => selectedOffers.has(o._id))
                  ? 'Desselecionar Todas'
                  : 'Selecionar Todas'}
              </span>
            </button>
            {selectedOffers.size > 0 && (
              <span className="text-gray-600 font-medium">
                {selectedOffers.size} {selectedOffers.size === 1 ? 'oferta selecionada' : 'ofertas selecionadas'}
              </span>
            )}
          </div>
          {selectedOffers.size > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDeleteSelected(true)}
                disabled={deletingMultiple}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deletingMultiple ? 'Excluindo...' : `Excluir ${selectedOffers.size}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grouped Offers */}
      {Object.entries(filteredAndGroupedOffers).map(([groupKey, groupOffers]) => (
        <div key={groupKey}>
          {/* Group Header */}
          {groupBy !== 'none' && groupOffers.length > 0 && (
            <div className="mb-4 mt-6 first:mt-0">
              <h3 className="text-2xl font-bold text-gray-800 capitalize flex items-center gap-2">
                <span className="w-1 h-8 bg-purple-600 rounded"></span>
                {groupKey === 'all' ? 'Todas as Ofertas' : groupKey}
                <span className="text-lg font-normal text-gray-500">
                  ({groupOffers.length})
                </span>
              </h3>
            </div>
          )}

          {/* Offers List */}
          {groupOffers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma oferta encontrada com os filtros aplicados
            </div>
          ) : (
            groupOffers.map((offer) => (
              <div
                key={offer._id}
                className={`bg-white rounded-xl border-2 p-6 hover:shadow-lg transition-all duration-300 mb-4 ${
                  selectedOffers.has(offer._id) 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-100 hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Checkbox for selection */}
                  <div className="flex items-start">
                    <button
                      onClick={() => handleToggleSelect(offer._id)}
                      className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {selectedOffers.has(offer._id) ? (
                        <CheckSquare className="w-6 h-6 text-purple-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  {/* Image */}
                  <div className="flex-shrink-0">
                    {offer.imageUrl ? (
                      <img
                        src={offer.imageUrl}
                        alt={offer.title}
                        className="w-full md:w-32 h-32 object-cover rounded-lg shadow-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-full md:w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center ${offer.imageUrl ? 'hidden' : ''}`}>
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{offer.title}</h3>
                      {offer.isPosted && (
                        <span className="flex-shrink-0 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          Publicado
                        </span>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                      <span className={`px-3 py-1 rounded-full border font-medium capitalize ${getSourceColor(offer.source)}`}>
                        {offer.source}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                        {offer.category}
                      </span>
                      <span className="text-gray-500">
                        {format(new Date(offer.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                      {offer.rating && offer.rating > 0 && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          ⭐ {offer.rating.toFixed(1)}
                          {offer.reviewsCount && offer.reviewsCount > 0 && (
                            <span className="text-gray-500">({offer.reviewsCount})</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-green-600">
                          R$ {offer.currentPrice.toFixed(2)}
                        </span>
                        <span className="text-lg text-gray-400 line-through">
                          R$ {offer.originalPrice.toFixed(2)}
                        </span>
                      </div>
                      <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg text-lg font-bold shadow-md">
                        {offer.discountPercentage.toFixed(0)}% OFF
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleGeneratePost(offer._id)}
                        disabled={posting === offer._id}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {posting === offer._id ? 'Gerando...' : 'Gerar Post IA'}
                      </button>
                      <button
                        onClick={() => handlePost(offer._id)}
                        disabled={posting === offer._id || offer.isPosted}
                        className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {posting === offer._id
                          ? 'Publicando...'
                          : offer.isPosted
                          ? 'Já Publicado'
                          : 'Publicar'}
                      </button>
                      {offer.affiliateUrl && (
                        <a
                          href={offer.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Ver Oferta
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(offer._id, true)}
                        disabled={deleting === offer._id}
                        className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting === offer._id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  )
}



