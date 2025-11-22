'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface CollectButtonProps {
  onCollect: () => void
}

export function CollectButton({ onCollect }: CollectButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleCollect = async () => {
    try {
      setLoading(true)
      setSuccess(false)
      setMessage('Coletando ofertas de todas as fontes...')
      
      const response = await api.post('/collector/run-all')
      
      setSuccess(true)
      const mercadolivre = response.data.mercadolivre || 0
      setMessage(
        `✅ Coleta concluída! ${response.data.total} ofertas coletadas (Amazon: ${response.data.amazon}, AliExpress: ${response.data.aliexpress}, Mercado Livre: ${mercadolivre}, RSS: ${response.data.rss})`
      )
      
      onCollect()
      setTimeout(() => {
        setMessage('')
        setSuccess(false)
      }, 8000)
    } catch (error: any) {
      console.error('Error collecting:', error)
      setSuccess(false)
      
      let errorMessage = '❌ Erro ao coletar ofertas. Verifique as configurações.'
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = '❌ Backend não está acessível. Verifique se está rodando na porta 3000.'
      } else if (error.response?.status === 401) {
        errorMessage = '❌ Não autenticado. Faça login novamente.'
      } else if (error.response?.data?.error) {
        errorMessage = `❌ ${error.response.data.error}`
      }
      
      setMessage(errorMessage)
      setTimeout(() => setMessage(''), 8000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-xl shadow-xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          onClick={handleCollect}
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Coletando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Coletar Ofertas Agora
            </>
          )}
        </button>
        
        {message && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            success 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {success ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
