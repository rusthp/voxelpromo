'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Settings, Save, TestTube, CheckCircle2, XCircle, Loader, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

function SettingsContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<any>({})
  const hasLoadedRef = useRef(false)
  const [config, setConfig] = useState<any>({
    amazon: {},
    aliexpress: {},
    mercadolivre: {},
    telegram: {},
    whatsapp: { enabled: false },
    x: {},
    ai: { provider: 'groq' },
    rss: [],
    collection: {
      enabled: true,
      schedule: '0 */6 * * *',
      sources: ['amazon', 'aliexpress', 'mercadolivre', 'rss']
    }
  })

  useEffect(() => {
    // Prevent multiple loads
    if (hasLoadedRef.current) {
      return
    }
    hasLoadedRef.current = true
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await api.get('/config')
      // When loading, preserve existing user input if they're typing
      setConfig((prev: any) => {
        const loaded = response.data;
        // Only update if we actually got new data
        if (!loaded || Object.keys(loaded).length === 0) {
          return prev
        }
        return {
          ...loaded,
          // Only overwrite with *** if user hasn't typed anything new
          telegram: {
            ...loaded.telegram,
            botToken: prev.telegram?.botToken && 
                      prev.telegram.botToken !== '***' && 
                      prev.telegram.botToken.length > 10
              ? prev.telegram.botToken // Keep user input
              : (loaded.telegram?.botToken === '***' ? '' : loaded.telegram?.botToken || '') // Clear if masked
          },
          ai: {
            ...loaded.ai,
            groqApiKey: prev.ai?.groqApiKey && 
                        prev.ai.groqApiKey !== '***' && 
                        prev.ai.groqApiKey.length > 20
              ? prev.ai.groqApiKey // Keep user input
              : (loaded.ai?.groqApiKey === '***' ? '' : loaded.ai?.groqApiKey || '') // Clear if masked
          }
        };
      });
      console.log('Config loaded:', {
        telegram: {
          hasToken: !!response.data.telegram?.botToken,
          tokenLength: response.data.telegram?.botToken?.length || 0,
          chatId: response.data.telegram?.chatId
        },
        ai: {
          hasGroqKey: !!response.data.ai?.groqApiKey,
          groqKeyLength: response.data.ai?.groqApiKey?.length || 0
        }
      })
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e?: React.FormEvent) => {
    // Prevent form submission if called from form
    if (e) {
      e.preventDefault()
    }
    
    try {
      setSaving(true)
      
      // Get current input values directly from state
      const currentTelegramToken = config.telegram?.botToken || ''
      const currentTelegramChatId = config.telegram?.chatId || ''
      const currentGroqKey = config.ai?.groqApiKey || ''
      
      console.log('Saving config:', {
        telegram: {
          botToken: currentTelegramToken ? currentTelegramToken.substring(0, 10) + '...' : 'empty',
          botTokenLength: currentTelegramToken.length,
          chatId: currentTelegramChatId
        },
        ai: {
          groqApiKey: currentGroqKey ? currentGroqKey.substring(0, 10) + '...' : 'empty',
          groqKeyLength: currentGroqKey.length
        }
      })
      
      // Prepare values to save - always send all fields, even if empty
      // Backend will handle preserving existing values if new ones are invalid
      const valuesToSave = {
        ...config,
        telegram: {
          ...config.telegram,
          // Send botToken if it's not the masked value and has reasonable length
          // Telegram bot tokens are typically 45+ characters, but we'll accept anything > 10
          botToken: currentTelegramToken && 
                    currentTelegramToken !== '***' && 
                    currentTelegramToken.trim().length > 0
            ? currentTelegramToken.trim()
            : (currentTelegramToken === '' ? '' : undefined), // Send empty string to clear, undefined to preserve
          chatId: currentTelegramChatId || ''
        },
        ai: {
          ...config.ai,
          // Send groqApiKey if it's not the masked value and has reasonable length
          // Groq API keys start with "gsk_" and are typically 50+ characters
          groqApiKey: currentGroqKey && 
                      currentGroqKey !== '***' && 
                      currentGroqKey.trim().length > 0
            ? currentGroqKey.trim()
            : (currentGroqKey === '' ? '' : undefined) // Send empty string to clear, undefined to preserve
        }
      };
      
      console.log('Sending config to backend:', {
        telegram: {
          hasToken: !!valuesToSave.telegram?.botToken,
          tokenLength: valuesToSave.telegram?.botToken?.length || 0,
          isUndefined: valuesToSave.telegram?.botToken === undefined
        },
        ai: {
          hasGroqKey: !!valuesToSave.ai?.groqApiKey,
          groqKeyLength: valuesToSave.ai?.groqApiKey?.length || 0,
          isUndefined: valuesToSave.ai?.groqApiKey === undefined
        }
      });
      
      const response = await api.post('/config', valuesToSave)
      
      if (response.data && response.data.success !== false) {
        // Success - preserve user input values in state
        setConfig((prev: any) => ({
          ...prev,
          telegram: {
            ...prev.telegram,
            // Keep the values user just typed
            botToken: currentTelegramToken && currentTelegramToken !== '***' 
              ? currentTelegramToken 
              : prev.telegram?.botToken || '',
            chatId: currentTelegramChatId || prev.telegram?.chatId || ''
          },
          ai: {
            ...prev.ai,
            groqApiKey: currentGroqKey && currentGroqKey !== '***' 
              ? currentGroqKey 
              : prev.ai?.groqApiKey || ''
          }
        }));
        
        const message = response.data?.message || 'Configuração salva com sucesso!'
        alert('✅ ' + message)
        
        // Log success details
        console.log('Save successful:', {
          telegram: {
            hasToken: !!response.data.saved?.telegram?.hasToken,
            tokenLength: response.data.saved?.telegram?.tokenLength || 0
          },
          ai: {
            hasGroqKey: !!response.data.saved?.ai?.hasGroqKey,
            groqKeyLength: response.data.saved?.ai?.groqKeyLength || 0
          }
        })
      } else {
        const errorMsg = response.data?.error || 'Erro desconhecido'
        alert('❌ Erro: ' + errorMsg)
        console.error('Save failed:', response.data)
      }
    } catch (error: any) {
      console.error('Save error:', error)
      let errorMessage = 'Erro desconhecido'
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errorMessage = 'Erro de conexão. Verifique se o backend está rodando em http://localhost:3000'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert('❌ Erro ao salvar: ' + errorMessage)
      console.error('Full error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (service?: string) => {
    try {
      setTesting(service || 'all')
      setTestResults({}) // Clear previous results
      
      const response = await api.post('/config/test', { service })
      
      if (response.data) {
        setTestResults(response.data)
        
        // Show alert with results
        const results = response.data
        let message = '📊 Resultados dos testes:\n\n'
        
        if (results.amazon) {
          message += `Amazon: ${results.amazon.success ? '✅' : '❌'} ${results.amazon.message || ''}\n`
        }
        if (results.aliexpress) {
          message += `AliExpress: ${results.aliexpress.success ? '✅' : '❌'} ${results.aliexpress.message || ''}\n`
        }
        if (results.mercadolivre) {
          message += `Mercado Livre: ${results.mercadolivre.success ? '✅' : '❌'} ${results.mercadolivre.message || ''}\n`
        }
        if (results.telegram) {
          message += `Telegram: ${results.telegram.success ? '✅' : '❌'} ${results.telegram.message || ''}\n`
        }
        if (results.x || results.twitter) {
          const xResult = results.x || results.twitter;
          message += `X (Twitter): ${xResult.success ? '✅' : '❌'} ${xResult.message || ''}\n`
        }
        if (results.ai) {
          message += `IA: ${results.ai.success ? '✅' : '❌'} ${results.ai.message || ''}\n`
        }
        if (results.error) {
          message += `\n❌ Erro: ${results.error}`
        }
        
        alert(message)
      }
    } catch (error: any) {
      console.error('Test error:', error)
      let errorMessage = 'Erro desconhecido'
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errorMessage = 'Erro de conexão. Verifique se o backend está rodando em http://localhost:3000'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setTestResults({ error: errorMessage })
      alert('❌ Erro ao testar: ' + errorMessage)
    } finally {
      setTesting(null)
    }
  }

  const updateConfig = (section: string, field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-purple-600" />
              <h1 className="text-4xl font-bold text-gray-800">Configurações</h1>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
          </div>
          <p className="text-gray-600">Configure as fontes de ofertas, bots e serviços</p>
        </div>

        {/* Amazon PA-API */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Amazon PA-API</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Key
              </label>
              <input
                type="password"
                value={config.amazon?.accessKey || ''}
                onChange={(e) => updateConfig('amazon', 'accessKey', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Sua Amazon Access Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Key
              </label>
              <input
                type="password"
                value={config.amazon?.secretKey || ''}
                onChange={(e) => updateConfig('amazon', 'secretKey', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Sua Amazon Secret Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Associate Tag
              </label>
              <input
                type="text"
                value={config.amazon?.associateTag || ''}
                onChange={(e) => updateConfig('amazon', 'associateTag', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="seu-tag-20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Região
              </label>
              <select
                value={config.amazon?.region || 'BR'}
                onChange={(e) => updateConfig('amazon', 'region', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                title="Região da Amazon"
                aria-label="Região da Amazon"
              >
                <option value="BR">Brasil</option>
                <option value="US">Estados Unidos</option>
                <option value="UK">Reino Unido</option>
              </select>
            </div>
            <button
              onClick={() => handleTest('amazon')}
              disabled={testing === 'amazon'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {testing === 'amazon' ? 'Testando...' : 'Testar Conexão'}
            </button>
            {testResults.amazon && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testResults.amazon.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {testResults.amazon.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{testResults.amazon.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* AliExpress */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">AliExpress Affiliate API</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Key
              </label>
              <input
                type="password"
                value={config.aliexpress?.appKey || ''}
                onChange={(e) => updateConfig('aliexpress', 'appKey', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Sua AliExpress App Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Secret
              </label>
              <input
                type="password"
                value={config.aliexpress?.appSecret || ''}
                onChange={(e) => updateConfig('aliexpress', 'appSecret', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Sua AliExpress App Secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking ID
              </label>
              <input
                type="text"
                value={config.aliexpress?.trackingId || ''}
                onChange={(e) => updateConfig('aliexpress', 'trackingId', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Seu Tracking ID"
              />
            </div>
          </div>
        </div>

        {/* Mercado Livre */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Mercado Livre API</h2>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Informação:</strong> O Mercado Livre usa OAuth 2.0 para autenticação. 
                Configure as credenciais abaixo e depois autorize o aplicativo.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID (App ID)
              </label>
              <input
                type="text"
                value={config.mercadolivre?.clientId || ''}
                onChange={(e) => updateConfig('mercadolivre', 'clientId', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="6477386821612832"
              />
              <p className="text-xs text-gray-500 mt-1">
                ID do aplicativo criado no{' '}
                <a href="https://developers.mercadolivre.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  DevCenter do Mercado Livre
                </a>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret (Secret Key)
              </label>
              <input
                type="password"
                value={config.mercadolivre?.clientSecret === '***' ? '' : (config.mercadolivre?.clientSecret || '')}
                onChange={(e) => updateConfig('mercadolivre', 'clientSecret', e.target.value)}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed !== e.target.value) {
                    updateConfig('mercadolivre', 'clientSecret', trimmed);
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Sua Secret Key"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Redirect URI
              </label>
              <input
                type="text"
                value={config.mercadolivre?.redirectUri || ''}
                onChange={(e) => updateConfig('mercadolivre', 'redirectUri', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://seusite.com.br/"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL de redirecionamento configurada no aplicativo (deve ser exatamente igual)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de Afiliado ou Link do Hub
              </label>
              <input
                type="text"
                value={config.mercadolivre?.affiliateCode || ''}
                onChange={(e) => updateConfig('mercadolivre', 'affiliateCode', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Seu código de afiliado ou URL do hub de afiliados"
              />
              <p className="text-xs text-gray-500 mt-1">
                Código do programa de afiliados (ex: "ABC123") ou URL completa do hub de afiliados.
                <br />
                Exemplos:
                <br />
                • Código simples: <code className="bg-gray-100 px-1 rounded">ABC123</code>
                <br />
                • Hub de afiliados: <code className="bg-gray-100 px-1 rounded">https://www.mercadolivre.com.br/afiliados/hub#...</code>
                <br />
                Deixe em branco para usar links diretos.
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Autenticação OAuth</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status da Autenticação</p>
                    <p className="text-xs text-gray-500">
                      {config.mercadolivre?.accessToken 
                        ? '✅ Autenticado (Token válido)' 
                        : '❌ Não autenticado'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.get('/mercadolivre/auth/status');
                        if (response.data.authenticated) {
                          alert('✅ Autenticado!\n\nToken válido até: ' + 
                            (response.data.expiresAt ? new Date(response.data.expiresAt).toLocaleString('pt-BR') : 'N/A'));
                        } else {
                          alert('❌ Não autenticado.\n\nConfigure as credenciais e autorize o aplicativo.');
                        }
                      } catch (error: any) {
                        alert('Erro ao verificar status: ' + (error.response?.data?.error || error.message));
                      }
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Verificar Status
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.get('/mercadolivre/auth/url');
                        if (response.data.url) {
                          window.open(response.data.url, '_blank');
                          alert('✅ URL de autorização aberta!\n\nApós autorizar, você será redirecionado. Copie o código da URL e use o botão "Trocar Código por Token" abaixo.');
                        } else {
                          alert('Erro: URL de autorização não disponível. Verifique as credenciais.');
                        }
                      } catch (error: any) {
                        alert('Erro ao obter URL: ' + (error.response?.data?.error || error.message));
                      }
                    }}
                    disabled={!config.mercadolivre?.clientId || !config.mercadolivre?.clientSecret}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    🔗 Obter URL de Autorização
                  </button>
                  
                  <button
                    onClick={async () => {
                      // Validate clientSecret is configured
                      if (!config.mercadolivre?.clientSecret || config.mercadolivre.clientSecret.trim().length === 0) {
                        alert('❌ Erro: Client Secret não configurado!\n\nPor favor, adicione o Client Secret antes de trocar o código por token.');
                        return;
                      }

                      const code = prompt('Cole o código de autorização da URL de redirecionamento:\n\n⚠️ IMPORTANTE: Códigos OAuth expiram em 10 minutos!\nUse o código imediatamente após obter.');
                      if (!code) return;
                      
                      // Clean code (remove URL parameters if user pasted full URL)
                      const cleanCode = code.trim().split('?code=').pop()?.split('&')[0] || code.trim();
                      
                      try {
                        setTesting('mercadolivre');
                        const response = await api.post('/mercadolivre/auth/exchange', { code: cleanCode });
                        if (response.data.success) {
                          alert('✅ Token obtido com sucesso!\n\nO sistema está autenticado e pronto para usar.\n\nToken expira em: ' + (response.data.data?.expiresIn ? Math.floor(response.data.data.expiresIn / 3600) + ' horas' : '6 horas'));
                          // Update only the token status without full reload
                          setConfig((prev: any) => ({
                            ...prev,
                            mercadolivre: {
                              ...prev.mercadolivre,
                              accessToken: response.data.data?.accessToken || prev.mercadolivre?.accessToken,
                              refreshToken: response.data.data?.refreshToken || prev.mercadolivre?.refreshToken
                            }
                          }))
                        } else {
                          alert('❌ Erro: ' + (response.data.error || 'Falha ao trocar código por token'));
                        }
                      } catch (error: any) {
                        let errorMessage = 'Erro desconhecido';
                        
                        if (error.response?.status === 400) {
                          const errorData = error.response.data;
                          if (errorData?.details?.error === 'invalid_grant') {
                            errorMessage = '❌ Código OAuth expirado ou já usado!\n\nOs códigos OAuth expiram em 10 minutos.\n\nSolução:\n1. Obtenha uma nova URL de autorização\n2. Autorize novamente\n3. Use o novo código imediatamente';
                          } else if (errorData?.error?.includes('Client Secret')) {
                            errorMessage = '❌ Client Secret não configurado!\n\nPor favor, salve o Client Secret primeiro e reinicie o backend.';
                          } else {
                            errorMessage = '❌ Erro 400: ' + (errorData?.error || errorData?.error_description || 'Requisição inválida');
                          }
                        } else if (error.response?.status === 401) {
                          errorMessage = '❌ Erro 401: Credenciais inválidas!\n\nVerifique se o Client ID e Client Secret estão corretos.';
                        } else {
                          errorMessage = '❌ Erro: ' + (error.response?.data?.error || error.message || 'Falha na comunicação');
                        }
                        
                        alert(errorMessage);
                      } finally {
                        setTesting(null);
                      }
                    }}
                    disabled={testing === 'mercadolivre' || !config.mercadolivre?.clientId || !config.mercadolivre?.clientSecret}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title={!config.mercadolivre?.clientSecret ? 'Configure o Client Secret primeiro' : ''}
                  >
                    {testing === 'mercadolivre' ? 'Processando...' : '🔄 Trocar Código por Token'}
                  </button>
                </div>

                <button
                  onClick={async () => {
                    try {
                      setTesting('mercadolivre-refresh');
                      const response = await api.post('/mercadolivre/auth/refresh');
                      if (response.data.success) {
                        alert('✅ Token renovado com sucesso!');
                        // Update only the token status without full reload
                        setConfig((prev: any) => ({
                          ...prev,
                          mercadolivre: {
                            ...prev.mercadolivre,
                            accessToken: response.data.data?.accessToken || prev.mercadolivre?.accessToken,
                            refreshToken: response.data.data?.refreshToken || prev.mercadolivre?.refreshToken
                          }
                        }))
                      } else {
                        alert('Erro: ' + (response.data.error || 'Falha ao renovar token'));
                      }
                    } catch (error: any) {
                      alert('Erro: ' + (error.response?.data?.error || error.message));
                    } finally {
                      setTesting(null);
                    }
                  }}
                  disabled={testing === 'mercadolivre-refresh' || !config.mercadolivre?.refreshToken}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {testing === 'mercadolivre-refresh' ? 'Renovando...' : '🔄 Renovar Token'}
                </button>
              </div>
            </div>

            <button
              onClick={() => handleTest('mercadolivre')}
              disabled={testing === 'mercadolivre'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {testing === 'mercadolivre' ? 'Testando...' : 'Testar Conexão'}
            </button>
            {testResults.mercadolivre && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testResults.mercadolivre.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {testResults.mercadolivre.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{testResults.mercadolivre.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Telegram */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Telegram Bot</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot Token
              </label>
              <input
                type="password"
                value={config.telegram?.botToken === '***' ? '' : (config.telegram?.botToken || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('BotToken onChange:', value.length, 'chars');
                  updateConfig('telegram', 'botToken', value);
                }}
                onBlur={(e) => {
                  // Trim whitespace on blur
                  const trimmed = e.target.value.trim();
                  if (trimmed !== e.target.value) {
                    updateConfig('telegram', 'botToken', trimmed);
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtenha em <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@BotFather</a>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat ID
              </label>
              <input
                type="text"
                value={config.telegram?.chatId || ''}
                onChange={(e) => updateConfig('telegram', 'chatId', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="123456789"
              />
              <p className="text-xs text-gray-500 mt-1">
                ID do canal ou grupo onde as ofertas serão enviadas
              </p>
            </div>
            <button
              onClick={() => handleTest('telegram')}
              disabled={testing === 'telegram'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {testing === 'telegram' ? 'Testando...' : 'Testar Bot'}
            </button>
            {testResults.telegram && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testResults.telegram.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {testResults.telegram.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{testResults.telegram.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">WhatsApp</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.whatsapp?.enabled || false}
                onChange={(e) => updateConfig('whatsapp', 'enabled', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium text-gray-700">Habilitar WhatsApp</span>
            </label>
            {config.whatsapp?.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Destino (com código do país)
                </label>
                <input
                  type="text"
                  value={config.whatsapp?.targetNumber || ''}
                  onChange={(e) => updateConfig('whatsapp', 'targetNumber', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="5511999999999"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: código do país + DDD + número (ex: 5511999999999)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* X (Twitter) */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">🐦 X (Twitter)</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Configure as credenciais do X para publicar ofertas automaticamente.
            </p>
            
            {/* OAuth 1.0a (Recomendado) */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">OAuth 1.0a (Recomendado - Full Access)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={config.x?.apiKey === '***' ? '' : (config.x?.apiKey || '')}
                    onChange={(e) => updateConfig('x', 'apiKey', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="eLrgtTlZwBlK7lhahEFDxBnGG"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key Secret
                  </label>
                  <input
                    type="password"
                    value={config.x?.apiKeySecret === '***' ? '' : (config.x?.apiKeySecret || '')}
                    onChange={(e) => updateConfig('x', 'apiKeySecret', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="zqQc7Ng6QFDIzdfyOjSQDKQmS0M4ZwGW1dLir1h06GT4KH1tYM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={config.x?.accessToken === '***' ? '' : (config.x?.accessToken || '')}
                    onChange={(e) => updateConfig('x', 'accessToken', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="1989828200801996801-3W7sMw13B4HSovMJVf2w3yxSDpyUWl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token Secret
                  </label>
                  <input
                    type="password"
                    value={config.x?.accessTokenSecret === '***' ? '' : (config.x?.accessTokenSecret || '')}
                    onChange={(e) => updateConfig('x', 'accessTokenSecret', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="0AZ1kcjFVjNnTwhaV1DvDpaEKIyLCCSfdNvh3G1560OkK"
                  />
                </div>
              </div>
            </div>

            {/* OAuth 2.0 (Client ID/Secret) */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">OAuth 2.0 (Client ID/Secret)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID
                  </label>
                  <input
                    type="password"
                    value={config.x?.oauth2ClientId === '***' ? '' : (config.x?.oauth2ClientId || '')}
                    onChange={(e) => updateConfig('x', 'oauth2ClientId', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="OHZKMHFCcGdxWEozNG51dXFFeDA6MTpjaQ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={config.x?.oauth2ClientSecret === '***' ? '' : (config.x?.oauth2ClientSecret || '')}
                    onChange={(e) => updateConfig('x', 'oauth2ClientSecret', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="2SAE9qb-S66eAIbSR63-excqxsbVc3TeQGlZa53EOZUl-blp-o"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Redirect URI
                  </label>
                  <input
                    type="text"
                    value={config.x?.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback'}
                    onChange={(e) => updateConfig('x', 'oauth2RedirectUri', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="http://localhost:3000/api/x/auth/callback"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Configure este mesmo URI no Twitter Developer Portal
                  </p>
                </div>
                {config.x?.oauth2ClientId && config.x?.oauth2ClientSecret && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.get('/x/auth/url');
                        const data = response.data;
                        if (data.success && data.authUrl) {
                          // Open in new window for OAuth flow
                          window.open(data.authUrl, 'X OAuth', 'width=600,height=700');
                        } else {
                          alert('Erro ao gerar URL de autorização: ' + (data.error || 'Erro desconhecido'));
                        }
                      } catch (error: any) {
                        const errorMsg = error.response?.data?.error || error.message || 'Erro desconhecido';
                        alert('Erro ao conectar com X: ' + errorMsg);
                      }
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    🔗 Conectar com X (Twitter)
                  </button>
                )}
                {config.x?.oauth2AccessToken && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✅ OAuth 2.0 conectado! Token válido até {config.x?.oauth2TokenExpiresAt ? new Date(config.x.oauth2TokenExpiresAt).toLocaleString('pt-BR') : 'indefinido'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bearer Token (Opcional) */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Bearer Token (Opcional - Pode ter limitações)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bearer Token
                </label>
                <input
                  type="password"
                  value={config.x?.bearerToken === '***' ? '' : (config.x?.bearerToken || '')}
                  onChange={(e) => updateConfig('x', 'bearerToken', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="AAAAAAAAAAAAAAAAAAAAAGwg5gEAAAAA..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bearer Token pode ter limitações para postar. OAuth 1.0a ou OAuth 2.0 é recomendado.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleTest('x')}
              disabled={testing === 'x'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {testing === 'x' ? 'Testando...' : 'Testar X (Twitter)'}
            </button>
            {testResults.x && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testResults.x.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {testResults.x.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{testResults.x.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Service */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Serviço de IA</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provedor
              </label>
              <select
                value={config.ai?.provider || 'groq'}
                onChange={(e) => updateConfig('ai', 'provider', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                title="Provedor de IA"
                aria-label="Provedor de IA"
              >
                <option value="groq">Groq (Recomendado - Gratuito)</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            {config.ai?.provider === 'groq' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Groq API Key
                </label>
                <input
                  type="password"
                  value={config.ai?.groqApiKey === '***' ? '' : (config.ai?.groqApiKey || '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('GroqApiKey onChange:', value.length, 'chars');
                    updateConfig('ai', 'groqApiKey', value);
                  }}
                  onBlur={(e) => {
                    // Trim whitespace on blur
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) {
                      updateConfig('ai', 'groqApiKey', trimmed);
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Sua Groq API Key"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Obtenha em <a href="https://console.groq.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">console.groq.com</a>
                </p>
              </div>
            )}
            {config.ai?.provider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={config.ai?.openaiApiKey || ''}
                  onChange={(e) => updateConfig('ai', 'openaiApiKey', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="sk-..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Obtenha em <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">platform.openai.com</a>
                </p>
              </div>
            )}
            <button
              onClick={() => handleTest('ai')}
              disabled={testing === 'ai'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {testing === 'ai' ? 'Testando...' : 'Testar Serviço'}
            </button>
            {testResults.ai && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testResults.ai.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {testResults.ai.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{testResults.ai.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* RSS Feeds */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Feeds RSS</h2>
          <div className="space-y-3">
            {(config.rss || []).map((feed: any, index: number) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={feed.url || ''}
                  onChange={(e) => {
                    const newRss = [...(config.rss || [])]
                    newRss[index] = { ...newRss[index], url: e.target.value }
                    setConfig({ ...config, rss: newRss })
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="https://exemplo.com/feed.xml"
                />
                <select
                  value={feed.source || 'rss'}
                  onChange={(e) => {
                    const newRss = [...(config.rss || [])]
                    newRss[index] = { ...newRss[index], source: e.target.value }
                    setConfig({ ...config, rss: newRss })
                  }}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  title="Fonte do feed RSS"
                  aria-label="Fonte do feed RSS"
                >
                  <option value="rss">RSS</option>
                  <option value="pelando">Pelando</option>
                  <option value="promobit">Promobit</option>
                </select>
                <button
                  onClick={() => {
                    const newRss = (config.rss || []).filter((_: any, i: number) => i !== index)
                    setConfig({ ...config, rss: newRss })
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                setConfig({
                  ...config,
                  rss: [...(config.rss || []), { url: '', source: 'rss' }]
                })
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              + Adicionar Feed RSS
            </button>
          </div>
        </div>

        {/* Collection Settings */}
        <div className="glass rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Configurações de Coleta</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.collection?.enabled !== false}
                onChange={(e) => updateConfig('collection', 'enabled', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium text-gray-700">Coleta Automática Habilitada</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fontes de Coleta
              </label>
              <div className="space-y-2">
                {['amazon', 'aliexpress', 'mercadolivre', 'rss'].map((source) => (
                  <label key={source} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(config.collection?.sources || []).includes(source)}
                      onChange={(e) => {
                        const sources = config.collection?.sources || []
                        const newSources = e.target.checked
                          ? [...sources, source]
                          : sources.filter((s: string) => s !== source)
                        updateConfig('collection', 'sources', newSources)
                      }}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700 capitalize">{source}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}

