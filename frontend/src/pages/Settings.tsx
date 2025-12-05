import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, TestTube2, Bot, Play, Pause, Clock, Plus, Trash2, Rss, ExternalLink, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { FaTelegram, FaWhatsapp, FaDiscord, FaXTwitter, FaAmazon, FaShopify } from "react-icons/fa6";
import { SiAliexpress, SiMercadopago } from "react-icons/si";
import { toast } from "sonner";
import api from "@/services/api";

const Settings = () => {
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);
    const [automationStatus, setAutomationStatus] = useState({ isActive: false, shouldPost: false });
    const [newShopeeFeed, setNewShopeeFeed] = useState("");
    const [newRssFeed, setNewRssFeed] = useState("");

    // Mercado Livre OAuth state
    const [mlAuthStatus, setMlAuthStatus] = useState<{
        authenticated: boolean;
        hasRefreshToken: boolean;
        isExpired: boolean;
        expiresIn: number;
        expiresAt: string | null;
        loading: boolean;
        error?: string;
    }>({
        authenticated: false,
        hasRefreshToken: false,
        isExpired: false,
        expiresIn: 0,
        expiresAt: null,
        loading: true,
    });
    const [mlOAuthLoading, setMlOAuthLoading] = useState(false);
    const [mlOAuthCode, setMlOAuthCode] = useState(""); // For manual OAuth code input
    const [mlCustomUrl, setMlCustomUrl] = useState(""); // For custom URL scraping
    const [mlScraping, setMlScraping] = useState(false); // Scraping state

    // Amazon scraping state
    const [amazonCustomUrl, setAmazonCustomUrl] = useState("");
    const [amazonScraping, setAmazonScraping] = useState(false);

    const [config, setConfig] = useState({
        // AI Configuration
        ai: {
            provider: "groq",
            groqApiKey: "",
            openaiApiKey: "",
        },
        // Telegram
        telegram: {
            botToken: "",
            chatId: "",
        },
        // WhatsApp
        whatsapp: {
            enabled: false,
            targetNumber: "",
            library: "whatsapp-web.js",
        },
        // X (Twitter)
        x: {
            bearerToken: "",
            apiKey: "",
            apiKeySecret: "",
            accessToken: "",
            accessTokenSecret: "",
        },
        // Amazon
        amazon: {
            accessKey: "",
            secretKey: "",
            associateTag: "",
            region: "sa-east-1",
        },
        // AliExpress
        aliexpress: {
            appKey: "",
            appSecret: "",
            trackingId: "",
        },
        // Mercado Livre
        mercadolivre: {
            clientId: "",
            clientSecret: "",
            redirectUri: "",
            affiliateCode: "",
            // Internal API for affiliate links (Phase 1 - Personal Use)
            sessionCookies: "",
            csrfToken: "",
            affiliateTag: "",
        },
        // Shopee
        shopee: {
            feedUrls: [] as string[],
            affiliateCode: "",
            minDiscount: 0,
        },
        // Automation
        automation: {
            isActive: false,
            startHour: 8,
            endHour: 22,
            intervalMinutes: 30,
            enabledChannels: ["telegram"],
            minDiscount: 20,
            maxPrice: 0,
        }
    });

    useEffect(() => {
        fetchConfig();
        fetchAutomationStatus();
        fetchMlAuthStatus();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/config');
            console.log("Config loaded:", response.data);

            setConfig(prev => {
                const newConfig = {
                    ...prev,
                    ...response.data,
                    // Ensure deep merge for nested objects that might be partial in response
                    shopee: {
                        ...prev.shopee,
                        ...(response.data.shopee || {}),
                        feedUrls: response.data.shopee?.feedUrls || prev.shopee.feedUrls || []
                    },
                    rss: response.data.rss || prev.rss || []
                };
                return newConfig;
            });

            // Also fetch automation config specifically if needed
            try {
                const autoResponse = await api.get('/automation/config');
                if (autoResponse.data) {
                    setConfig(prev => ({ ...prev, automation: { ...prev.automation, ...autoResponse.data } }));
                }
            } catch (e) {
                // Ignore if automation config not found yet
                console.log("Automation config not found or error:", e);
            }
        } catch (error) {
            console.error("Error fetching config:", error);
            toast.error("Erro ao carregar configurações.");
        }
    };

    // Mercado Livre OAuth functions
    const fetchMlAuthStatus = async () => {
        try {
            setMlAuthStatus(prev => ({ ...prev, loading: true, error: undefined }));
            const response = await api.get('/mercadolivre/auth/status');
            setMlAuthStatus({
                ...response.data,
                loading: false,
                error: undefined,
            });
        } catch (error: any) {
            console.error("Error fetching ML auth status:", error);
            setMlAuthStatus(prev => ({
                ...prev,
                loading: false,
                authenticated: false,
                error: error.response?.data?.error || "Erro ao verificar status",
            }));
        }
    };

    const startMlOAuth = async () => {
        try {
            setMlOAuthLoading(true);
            const response = await api.get('/mercadolivre/auth/url');

            if (response.data?.authUrl) {
                // Open in new window for OAuth flow
                const width = 600;
                const height = 700;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;

                const authWindow = window.open(
                    response.data.authUrl,
                    'MercadoLivreAuth',
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                );

                // Poll for window close
                const checkClosed = setInterval(() => {
                    if (authWindow?.closed) {
                        clearInterval(checkClosed);
                        setMlOAuthLoading(false);
                        fetchMlAuthStatus();
                        toast.info("Verifique se a autenticação foi concluída.");
                    }
                }, 500);

                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(checkClosed);
                    setMlOAuthLoading(false);
                }, 5 * 60 * 1000);
            }
        } catch (error: any) {
            console.error("Error starting OAuth:", error);
            toast.error(error.response?.data?.error || "Erro ao iniciar autenticação.");
            setMlOAuthLoading(false);
        }
    };

    const refreshMlToken = async () => {
        try {
            setMlOAuthLoading(true);
            await api.post('/mercadolivre/auth/refresh');
            toast.success("Token renovado com sucesso!");
            await fetchMlAuthStatus();
        } catch (error: any) {
            console.error("Error refreshing token:", error);
            toast.error(error.response?.data?.error || "Erro ao renovar token.");
        } finally {
            setMlOAuthLoading(false);
        }
    };

    const testMlConnection = async () => {
        try {
            setTesting('mercadolivre');
            const response = await api.get('/mercadolivre/status');

            if (response.data?.success) {
                toast.success(`Conectado como ${response.data.user?.nickname || 'usuário ML'}`);
            } else {
                toast.error(response.data?.error || "Falha na conexão com Mercado Livre.");
            }
        } catch (error: any) {
            console.error("Error testing ML:", error);
            toast.error(error.response?.data?.error || "Erro ao testar conexão.");
        } finally {
            setTesting(null);
        }
    };

    const formatExpiresIn = (seconds: number): string => {
        if (seconds <= 0) return "Expirado";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days} dia${days > 1 ? 's' : ''}`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes} min`;
    };

    // Extract code from URL or raw code input
    const extractOAuthCode = (input: string): string => {
        // If it's a URL, extract the code parameter
        if (input.includes('code=')) {
            try {
                const url = new URL(input);
                return url.searchParams.get('code') || '';
            } catch {
                // Try to extract with regex if URL parsing fails
                const match = input.match(/code=([^&]+)/);
                return match ? match[1] : '';
            }
        }
        // Return as-is if it's just the code
        return input.trim();
    };

    const exchangeMlOAuthCode = async () => {
        const code = extractOAuthCode(mlOAuthCode);

        if (!code) {
            toast.error("Cole a URL completa ou o código de autorização.");
            return;
        }

        try {
            setMlOAuthLoading(true);
            const response = await api.post('/mercadolivre/auth/exchange', { code });

            if (response.data?.success) {
                toast.success("🎉 Token obtido com sucesso! Conectado ao Mercado Livre.");
                setMlOAuthCode(""); // Clear the input
                await fetchMlAuthStatus();
            } else {
                toast.error(response.data?.error || "Erro ao trocar código por token.");
            }
        } catch (error: any) {
            console.error("Error exchanging OAuth code:", error);
            const errorMsg = error.response?.data?.error || "Erro ao trocar código por token.";

            // Provide helpful error messages
            if (errorMsg.includes('expirado') || errorMsg.includes('invalid_grant')) {
                toast.error("⚠️ Código expirado ou já usado. Por favor, conecte novamente.");
            } else if (errorMsg.includes('Client ID') || errorMsg.includes('Client Secret')) {
                toast.error("⚠️ Configure o Client ID e Client Secret primeiro.");
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setMlOAuthLoading(false);
        }
    };

    // Scrape products from a custom Mercado Livre URL
    const scrapeCustomUrl = async () => {
        if (!mlCustomUrl.trim()) {
            toast.error("Cole uma URL do Mercado Livre para coletar produtos.");
            return;
        }

        if (!mlCustomUrl.includes('mercadolivre.com.br')) {
            toast.error("A URL deve ser do Mercado Livre (mercadolivre.com.br).");
            return;
        }

        try {
            setMlScraping(true);
            toast.info("🕷️ Iniciando coleta... isso pode levar alguns segundos.");

            const response = await api.post('/mercadolivre/scrape-url', {
                url: mlCustomUrl,
                saveToDatabase: true,
            });

            if (response.data?.success) {
                const { totalFound, saved } = response.data;
                toast.success(`✅ Coletados ${totalFound} produtos, ${saved} salvos no banco!`);
                setMlCustomUrl(""); // Clear input on success
            } else {
                toast.error(response.data?.error || "Erro na coleta.");
            }
        } catch (error: any) {
            console.error("Error scraping URL:", error);
            toast.error(error.response?.data?.error || "Erro ao coletar produtos.");
        } finally {
            setMlScraping(false);
        }
    };

    // Scrape products from a custom Amazon URL
    const scrapeAmazonUrl = async () => {
        if (!amazonCustomUrl.trim()) {
            toast.error("Cole uma URL da Amazon para coletar o produto.");
            return;
        }

        if (!amazonCustomUrl.includes('amazon.com')) {
            toast.error("A URL deve ser da Amazon (amazon.com.br ou amazon.com).");
            return;
        }

        try {
            setAmazonScraping(true);
            toast.info("🕷️ Iniciando coleta... isso pode levar alguns segundos.");

            const response = await api.post('/amazon/scrape-url', {
                url: amazonCustomUrl,
                saveToDatabase: true,
            });

            if (response.data?.success) {
                const { totalFound, saved, product } = response.data;
                toast.success(`✅ Produto coletado: ${product?.title?.substring(0, 50)}...`);
                setAmazonCustomUrl(""); // Clear input on success
            } else {
                toast.error(response.data?.error || "Erro na coleta.");
            }
        } catch (error: any) {
            console.error("Error scraping Amazon URL:", error);
            toast.error(error.response?.data?.error || "Erro ao coletar produto da Amazon.");
        } finally {
            setAmazonScraping(false);
        }
    };

    const fetchAutomationStatus = async () => {
        try {
            const response = await api.get('/automation/status');
            setAutomationStatus(response.data);
        } catch (error) {
            console.error("Error fetching automation status:", error);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            console.log("Saving main config...", config);
            await api.post('/config', config);
            console.log("Main config saved.");

            // Save automation config separately
            try {
                console.log("Saving automation config...", config.automation);
                await api.post('/automation/config', config.automation);
                console.log("Automation config saved.");
            } catch (autoError: any) {
                console.error("Error saving automation config:", autoError);
                toast.warning("Configurações principais salvas, mas houve erro ao salvar automação.");
            }

            toast.success("Configurações salvas com sucesso!");

            // Reload to get masked values, but don't fail the save if this fails
            try {
                await fetchConfig();
                await fetchAutomationStatus();
            } catch (reloadError) {
                console.error("Error reloading after save:", reloadError);
            }
        } catch (error: any) {
            console.error("Error saving config:", error);
            const errorMsg = error.response?.data?.message || "Erro ao salvar configurações.";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async (service: string) => {
        try {
            setTesting(service);
            const response = await api.post('/config/test', { service });
            const result = response.data[service];
            if (result?.success) {
                toast.success(result.message);
            } else {
                toast.error(result?.message || "Erro ao testar configuração.");
            }
        } catch (error: any) {
            console.error(`Error testing ${service}:`, error);
            toast.error(`Erro ao testar ${service}.`);
        } finally {
            setTesting(null);
        }
    };

    const toggleAutomation = async () => {
        try {
            setLoading(true);
            const action = config.automation.isActive ? 'stop' : 'start';
            await api.post(`/automation/${action}`);

            setConfig(prev => ({
                ...prev,
                automation: { ...prev.automation, isActive: !prev.automation.isActive }
            }));

            await fetchAutomationStatus();
            toast.success(`Automação ${action === 'start' ? 'iniciada' : 'parada'} com sucesso!`);
        } catch (error) {
            console.error("Error toggling automation:", error);
            toast.error("Erro ao alterar status da automação.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to manage lists
    const addShopeeFeed = () => {
        if (!newShopeeFeed) return;
        if (config.shopee.feedUrls.includes(newShopeeFeed)) {
            toast.error("URL já adicionada");
            return;
        }
        setConfig({
            ...config,
            shopee: {
                ...config.shopee,
                feedUrls: [...config.shopee.feedUrls, newShopeeFeed]
            }
        });
        setNewShopeeFeed("");
    };

    const removeShopeeFeed = (index: number) => {
        const newFeeds = [...config.shopee.feedUrls];
        newFeeds.splice(index, 1);
        setConfig({
            ...config,
            shopee: {
                ...config.shopee,
                feedUrls: newFeeds
            }
        });
    };

    const addRssFeed = () => {
        if (!newRssFeed) return;
        if (config.rss.includes(newRssFeed)) {
            toast.error("URL já adicionada");
            return;
        }
        setConfig({
            ...config,
            rss: [...config.rss, newRssFeed]
        });
        setNewRssFeed("");
    };

    const removeRssFeed = (index: number) => {
        const newFeeds = [...config.rss];
        newFeeds.splice(index, 1);
        setConfig({
            ...config,
            rss: newFeeds
        });
    };

    return (
        <Layout>
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
                        <p className="text-muted-foreground">Gerencie as integrações e chaves de API</p>
                    </div>
                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Alterações
                    </Button>
                </div>

                <Tabs defaultValue="automation" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="automation">Automação</TabsTrigger>
                        <TabsTrigger value="ai">IA</TabsTrigger>
                        <TabsTrigger value="messaging">Mensageria</TabsTrigger>
                        <TabsTrigger value="affiliate">Afiliados</TabsTrigger>
                        <TabsTrigger value="collection">Coleta</TabsTrigger>
                    </TabsList>

                    {/* Automation Configuration */}
                    <TabsContent value="automation">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Bot className="w-5 h-5 text-primary" />
                                        Robô de Automação
                                    </CardTitle>
                                    <CardDescription>
                                        Configure o agendamento automático de postagens
                                    </CardDescription>
                                </div>
                                <Button
                                    variant={config.automation.isActive ? "destructive" : "default"}
                                    onClick={toggleAutomation}
                                    disabled={loading}
                                    className="gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : config.automation.isActive ? (
                                        <Pause className="w-4 h-4" />
                                    ) : (
                                        <Play className="w-4 h-4" />
                                    )}
                                    {config.automation.isActive ? "Parar Robô" : "Iniciar Robô"}
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Horários
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="startHour">Início (Hora)</Label>
                                                <Input
                                                    id="startHour"
                                                    type="number"
                                                    min="0"
                                                    max="23"
                                                    value={config.automation.startHour}
                                                    onChange={(e) => setConfig({
                                                        ...config,
                                                        automation: { ...config.automation, startHour: parseInt(e.target.value) }
                                                    })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="endHour">Fim (Hora)</Label>
                                                <Input
                                                    id="endHour"
                                                    type="number"
                                                    min="0"
                                                    max="23"
                                                    value={config.automation.endHour}
                                                    onChange={(e) => setConfig({
                                                        ...config,
                                                        automation: { ...config.automation, endHour: parseInt(e.target.value) }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="interval">Intervalo (minutos)</Label>
                                            <select
                                                id="interval"
                                                className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                                                value={config.automation.intervalMinutes}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    automation: { ...config.automation, intervalMinutes: parseInt(e.target.value) }
                                                })}
                                            >
                                                <option value="5">5 minutos (Risco de Spam)</option>
                                                <option value="15">15 minutos</option>
                                                <option value="30">30 minutos (Recomendado)</option>
                                                <option value="60">1 hora</option>
                                                <option value="120">2 horas</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium">Filtros e Canais</h3>
                                        <div className="space-y-2">
                                            <Label>Canais Ativos</Label>
                                            <div className="flex flex-wrap gap-4 pt-2">
                                                {['telegram', 'whatsapp', 'x'].map(channel => (
                                                    <div key={channel} className="flex items-center space-x-2">
                                                        <Switch
                                                            id={`auto-${channel}`}
                                                            checked={config.automation.enabledChannels.includes(channel)}
                                                            onCheckedChange={(checked) => {
                                                                const channels = checked
                                                                    ? [...config.automation.enabledChannels, channel]
                                                                    : config.automation.enabledChannels.filter(c => c !== channel);
                                                                setConfig({
                                                                    ...config,
                                                                    automation: { ...config.automation, enabledChannels: channels }
                                                                });
                                                            }}
                                                        />
                                                        <Label htmlFor={`auto-${channel}`} className="capitalize">
                                                            {channel === 'x' ? 'X (Twitter)' : channel}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <Label htmlFor="minDiscount">Desconto Mínimo (%)</Label>
                                            <Input
                                                id="minDiscount"
                                                type="number"
                                                value={config.automation.minDiscount}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    automation: { ...config.automation, minDiscount: parseInt(e.target.value) }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* AI Configuration */}
                    <TabsContent value="ai">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configuração de IA</CardTitle>
                                <CardDescription>
                                    Configure os provedores de Inteligência Artificial para geração de posts
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ai-provider">Provedor Padrão</Label>
                                    <select
                                        id="ai-provider"
                                        className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                                        value={config.ai.provider}
                                        onChange={(e) => setConfig({ ...config, ai: { ...config.ai, provider: e.target.value } })}
                                    >
                                        <option value="groq">Groq (Recomendado - Rápido e Gratuito)</option>
                                        <option value="openai">OpenAI (GPT-4)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="groqApiKey">Groq API Key</Label>
                                    <Input
                                        id="groqApiKey"
                                        type="password"
                                        value={config.ai.groqApiKey}
                                        onChange={(e) => setConfig({ ...config, ai: { ...config.ai, groqApiKey: e.target.value } })}
                                        placeholder="gsk_..."
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Obtenha sua chave em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.groq.com</a>
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                                    <Input
                                        id="openaiApiKey"
                                        type="password"
                                        value={config.ai.openaiApiKey}
                                        onChange={(e) => setConfig({ ...config, ai: { ...config.ai, openaiApiKey: e.target.value } })}
                                        placeholder="sk-..."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Messaging Platforms */}
                    <TabsContent value="messaging" className="space-y-6">
                        {/* Telegram */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FaTelegram className="w-5 h-5 text-[#0088cc]" />
                                        Telegram
                                    </CardTitle>
                                    <CardDescription>Configure o bot do Telegram para enviar ofertas</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTest('telegram')}
                                    disabled={testing === 'telegram'}
                                    className="gap-2"
                                >
                                    {testing === 'telegram' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Testar
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="telegramBotToken">Bot Token</Label>
                                    <Input
                                        id="telegramBotToken"
                                        type="password"
                                        value={config.telegram.botToken}
                                        onChange={(e) => setConfig({ ...config, telegram: { ...config.telegram, botToken: e.target.value } })}
                                        placeholder="123456:ABC-..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telegramChatId">Chat ID</Label>
                                    <Input
                                        id="telegramChatId"
                                        value={config.telegram.chatId}
                                        onChange={(e) => setConfig({ ...config, telegram: { ...config.telegram, chatId: e.target.value } })}
                                        placeholder="@canal ou -100..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* WhatsApp */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FaWhatsapp className="w-5 h-5 text-[#25D366]" />
                                    WhatsApp
                                </CardTitle>
                                <CardDescription>Configure o WhatsApp para enviar mensagens</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base">Habilitar WhatsApp</Label>
                                        <p className="text-sm text-muted-foreground">Enviar ofertas via WhatsApp</p>
                                    </div>
                                    <Switch
                                        checked={config.whatsapp.enabled}
                                        onCheckedChange={(checked) => setConfig({ ...config, whatsapp: { ...config.whatsapp, enabled: checked } })}
                                    />
                                </div>
                                {config.whatsapp.enabled && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="whatsappTarget">Número ou Grupo</Label>
                                            <Input
                                                id="whatsappTarget"
                                                value={config.whatsapp.targetNumber}
                                                onChange={(e) => setConfig({ ...config, whatsapp: { ...config.whatsapp, targetNumber: e.target.value } })}
                                                placeholder="5511999999999 ou 120363..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="whatsappLibrary">Biblioteca</Label>
                                            <select
                                                id="whatsappLibrary"
                                                className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                                                value={config.whatsapp.library}
                                                onChange={(e) => setConfig({ ...config, whatsapp: { ...config.whatsapp, library: e.target.value } })}
                                            >
                                                <option value="whatsapp-web.js">whatsapp-web.js (Mais estável)</option>
                                                <option value="baileys">Baileys (Mais leve)</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* X (Twitter) */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FaXTwitter className="w-5 h-5" />
                                        X (Twitter)
                                    </CardTitle>
                                    <CardDescription>Configure o X para publicar tweets</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTest('x')}
                                    disabled={testing === 'x'}
                                    className="gap-2"
                                >
                                    {testing === 'x' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Testar
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="xApiKey">API Key</Label>
                                    <Input
                                        id="xApiKey"
                                        type="password"
                                        value={config.x.apiKey}
                                        onChange={(e) => setConfig({ ...config, x: { ...config.x, apiKey: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="xApiKeySecret">API Key Secret</Label>
                                    <Input
                                        id="xApiKeySecret"
                                        type="password"
                                        value={config.x.apiKeySecret}
                                        onChange={(e) => setConfig({ ...config, x: { ...config.x, apiKeySecret: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="xAccessToken">Access Token</Label>
                                    <Input
                                        id="xAccessToken"
                                        type="password"
                                        value={config.x.accessToken}
                                        onChange={(e) => setConfig({ ...config, x: { ...config.x, accessToken: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="xAccessTokenSecret">Access Token Secret</Label>
                                    <Input
                                        id="xAccessTokenSecret"
                                        type="password"
                                        value={config.x.accessTokenSecret}
                                        onChange={(e) => setConfig({ ...config, x: { ...config.x, accessTokenSecret: e.target.value } })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Affiliate Platforms */}
                    <TabsContent value="affiliate" className="space-y-6">
                        {/* Amazon */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FaAmazon className="w-5 h-5 text-[#FF9900]" />
                                        Amazon PA-API
                                    </CardTitle>
                                    <CardDescription>Configure as credenciais da Amazon Product Advertising API</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTest('amazon')}
                                    disabled={testing === 'amazon'}
                                    className="gap-2"
                                >
                                    {testing === 'amazon' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Testar
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amazonAccessKey">Access Key</Label>
                                    <Input
                                        id="amazonAccessKey"
                                        type="password"
                                        value={config.amazon.accessKey}
                                        onChange={(e) => setConfig({ ...config, amazon: { ...config.amazon, accessKey: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amazonSecretKey">Secret Key</Label>
                                    <Input
                                        id="amazonSecretKey"
                                        type="password"
                                        value={config.amazon.secretKey}
                                        onChange={(e) => setConfig({ ...config, amazon: { ...config.amazon, secretKey: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amazonAssociateTag">Associate Tag</Label>
                                    <Input
                                        id="amazonAssociateTag"
                                        value={config.amazon.associateTag}
                                        onChange={(e) => setConfig({ ...config, amazon: { ...config.amazon, associateTag: e.target.value } })}
                                        placeholder="seu-tag-20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amazonRegion">Região</Label>
                                    <select
                                        id="amazonRegion"
                                        className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                                        value={config.amazon.region}
                                        onChange={(e) => setConfig({ ...config, amazon: { ...config.amazon, region: e.target.value } })}
                                    >
                                        <option value="sa-east-1">Brasil (sa-east-1)</option>
                                        <option value="us-east-1">EUA (us-east-1)</option>
                                    </select>
                                </div>

                                {/* Amazon Scraping Section */}
                                <div className="border-t pt-4 mt-4">
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <Rss className="w-4 h-4 text-orange-500" />
                                        Coletar Produto por URL
                                    </h4>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        ⚠️ Não precisa da PA-API! Cole qualquer link de produto da Amazon.
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://www.amazon.com.br/dp/B09XYZ1234"
                                            value={amazonCustomUrl}
                                            onChange={(e) => setAmazonCustomUrl(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={scrapeAmazonUrl}
                                            disabled={amazonScraping || !amazonCustomUrl.trim()}
                                            className="gap-2 bg-orange-600 hover:bg-orange-700"
                                        >
                                            {amazonScraping ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ExternalLink className="w-4 h-4" />
                                            )}
                                            Coletar
                                        </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        <p className="font-medium">Formatos aceitos:</p>
                                        <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                            <li>amazon.com.br/dp/ASIN</li>
                                            <li>amazon.com.br/gp/product/ASIN</li>
                                            <li>Links de afiliado (com ?tag=)</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* AliExpress */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <SiAliexpress className="w-5 h-5 text-[#E62E04]" />
                                    AliExpress
                                </CardTitle>
                                <CardDescription>Configure as credenciais do AliExpress Affiliate</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="aliexpressAppKey">App Key</Label>
                                    <Input
                                        id="aliexpressAppKey"
                                        type="password"
                                        value={config.aliexpress.appKey}
                                        onChange={(e) => setConfig({ ...config, aliexpress: { ...config.aliexpress, appKey: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="aliexpressAppSecret">App Secret</Label>
                                    <Input
                                        id="aliexpressAppSecret"
                                        type="password"
                                        value={config.aliexpress.appSecret}
                                        onChange={(e) => setConfig({ ...config, aliexpress: { ...config.aliexpress, appSecret: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="aliexpressTrackingId">Tracking ID</Label>
                                    <Input
                                        id="aliexpressTrackingId"
                                        value={config.aliexpress.trackingId}
                                        onChange={(e) => setConfig({ ...config, aliexpress: { ...config.aliexpress, trackingId: e.target.value } })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Mercado Livre */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <SiMercadopago className="w-5 h-5 text-[#FFE600]" />
                                        Mercado Livre
                                    </CardTitle>
                                    <CardDescription>Configure as credenciais do Mercado Livre</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={testMlConnection}
                                    disabled={testing === 'mercadolivre' || !mlAuthStatus.authenticated}
                                    className="gap-2"
                                >
                                    {testing === 'mercadolivre' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Testar
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* OAuth Status Section */}
                                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                            🔐 Status de Autenticação OAuth
                                        </h4>
                                        {mlAuthStatus.loading ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Verificando...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {mlAuthStatus.authenticated && !mlAuthStatus.isExpired ? (
                                                    <span className="flex items-center gap-1 text-sm text-green-500">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Conectado
                                                    </span>
                                                ) : mlAuthStatus.authenticated && mlAuthStatus.isExpired ? (
                                                    <span className="flex items-center gap-1 text-sm text-yellow-500">
                                                        <AlertCircle className="w-4 h-4" />
                                                        Token Expirado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-sm text-red-500">
                                                        <XCircle className="w-4 h-4" />
                                                        Não Conectado
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Token expiration info */}
                                    {mlAuthStatus.authenticated && !mlAuthStatus.isExpired && mlAuthStatus.expiresIn > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            ⏰ Token expira em: <span className="font-medium">{formatExpiresIn(mlAuthStatus.expiresIn)}</span>
                                        </p>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {!mlAuthStatus.authenticated ? (
                                            <Button
                                                onClick={startMlOAuth}
                                                disabled={mlOAuthLoading || !config.mercadolivre.clientId}
                                                className="gap-2"
                                                size="sm"
                                            >
                                                {mlOAuthLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ExternalLink className="w-4 h-4" />
                                                )}
                                                Conectar ao Mercado Livre
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    onClick={refreshMlToken}
                                                    disabled={mlOAuthLoading || !mlAuthStatus.hasRefreshToken}
                                                    className="gap-2"
                                                    size="sm"
                                                >
                                                    {mlOAuthLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4" />
                                                    )}
                                                    Renovar Token
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={startMlOAuth}
                                                    disabled={mlOAuthLoading}
                                                    className="gap-2"
                                                    size="sm"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Reconectar
                                                </Button>
                                            </>
                                        )}
                                    </div>

                                    {/* Manual OAuth Code Input - Show when not authenticated or for re-auth */}
                                    {!mlAuthStatus.authenticated && config.mercadolivre.clientId && (
                                        <div className="border-t pt-3 mt-3 space-y-2">
                                            <Label className="text-xs text-muted-foreground">
                                                📋 Cole a URL de retorno ou código de autorização:
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="https://proplaynews.com.br/?code=TG-xxx... ou TG-xxx..."
                                                    value={mlOAuthCode}
                                                    onChange={(e) => setMlOAuthCode(e.target.value)}
                                                    className="font-mono text-xs"
                                                />
                                                <Button
                                                    onClick={exchangeMlOAuthCode}
                                                    disabled={mlOAuthLoading || !mlOAuthCode.trim()}
                                                    size="sm"
                                                    className="shrink-0"
                                                >
                                                    {mlOAuthLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Validar"
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                💡 Após autorizar no Mercado Livre, você será redirecionado. Cole a URL completa aqui.
                                            </p>
                                        </div>
                                    )}

                                    {!config.mercadolivre.clientId && (
                                        <p className="text-xs text-yellow-500">
                                            ⚠️ Configure o Client ID e Client Secret primeiro para habilitar a conexão OAuth.
                                        </p>
                                    )}

                                    {/* Custom URL Scraping Section */}
                                    <div className="border-t pt-4 mt-4">
                                        <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                                            🕷️ Coletar de URL Personalizada
                                        </Label>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            Cole qualquer URL de ofertas do Mercado Livre para coletar produtos diretamente.
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="https://www.mercadolivre.com.br/ofertas?container_id=..."
                                                value={mlCustomUrl}
                                                onChange={(e) => setMlCustomUrl(e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                            <Button
                                                onClick={scrapeCustomUrl}
                                                disabled={mlScraping || !mlCustomUrl.trim()}
                                                size="sm"
                                                variant="glow"
                                                className="shrink-0"
                                            >
                                                {mlScraping ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                                        Coletando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <ExternalLink className="w-4 h-4 mr-1" />
                                                        Coletar
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <div className="mt-2 text-[10px] text-muted-foreground space-y-1">
                                            <p>💡 <strong>URLs sugeridas:</strong></p>
                                            <ul className="list-disc list-inside ml-2">
                                                <li><code>mercadolivre.com.br/ofertas</code> - Todas ofertas</li>
                                                <li><code>mercadolivre.com.br/ofertas?container_id=...</code> - Categoria</li>
                                                <li><code>lista.mercadolivre.com.br/iphone</code> - Busca</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mlClientId">Client ID</Label>
                                    <Input
                                        id="mlClientId"
                                        value={config.mercadolivre.clientId}
                                        onChange={(e) => setConfig({ ...config, mercadolivre: { ...config.mercadolivre, clientId: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mlClientSecret">Client Secret</Label>
                                    <Input
                                        id="mlClientSecret"
                                        type="password"
                                        value={config.mercadolivre.clientSecret}
                                        onChange={(e) => setConfig({ ...config, mercadolivre: { ...config.mercadolivre, clientSecret: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mlAffiliateCode">Código de Afiliado (Legacy)</Label>
                                    <Input
                                        id="mlAffiliateCode"
                                        value={config.mercadolivre.affiliateCode}
                                        onChange={(e) => setConfig({ ...config, mercadolivre: { ...config.mercadolivre, affiliateCode: e.target.value } })}
                                        placeholder="URL do Social Link ou código"
                                    />
                                </div>

                                {/* Internal API Section */}
                                <div className="border-t pt-4 mt-4">
                                    <h4 className="text-sm font-semibold mb-2 text-primary">🔗 API Interna (Links Afiliados)</h4>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Use a API interna do ML para gerar links curtos oficiais (mercadolivre.com/sec/...).
                                        Requer cookies de sessão e token CSRF.
                                    </p>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="mlAffiliateTag">Tag de Afiliado</Label>
                                            <Input
                                                id="mlAffiliateTag"
                                                value={config.mercadolivre.affiliateTag || ""}
                                                onChange={(e) => setConfig({ ...config, mercadolivre: { ...config.mercadolivre, affiliateTag: e.target.value } })}
                                                placeholder="voxelpromo"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Sua tag de afiliado (aparece nos links gerados)
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mlCsrfToken">x-csrf-token</Label>
                                            <Input
                                                id="mlCsrfToken"
                                                type="password"
                                                value={config.mercadolivre.csrfToken || ""}
                                                onChange={(e) => setConfig({ ...config, mercadolivre: { ...config.mercadolivre, csrfToken: e.target.value } })}
                                                placeholder="Token CSRF do ML"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mlSessionCookies">Session Cookies</Label>
                                            <textarea
                                                id="mlSessionCookies"
                                                className="w-full px-3 py-2 border border-input bg-background rounded-lg min-h-[80px] text-xs font-mono"
                                                value={config.mercadolivre.sessionCookies || ""}
                                                onChange={(e) => setConfig({ ...config, mercadolivre: { ...config.mercadolivre, sessionCookies: e.target.value } })}
                                                placeholder="Cole aqui os cookies da sessão logada..."
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                ⚠️ Cookies expiram periodicamente. Atualize se os links pararem de funcionar.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Instructions Dropdown */}
                                    <details className="mt-4 p-3 bg-muted/50 rounded-lg">
                                        <summary className="text-sm font-medium cursor-pointer">📋 Como obter cookies e CSRF token</summary>
                                        <ol className="mt-2 text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                            <li>Acesse <a href="https://www.mercadolivre.com.br/affiliate-program/link-builder" target="_blank" rel="noopener noreferrer" className="text-primary underline">mercadolivre.com.br/affiliate-program/link-builder</a></li>
                                            <li>Abra o DevTools (F12) → aba Network</li>
                                            <li>Gere um link de teste manualmente</li>
                                            <li>Encontre a requisição "createLink"</li>
                                            <li>Copie da aba Headers: "cookie" e "x-csrf-token"</li>
                                        </ol>
                                    </details>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Shopee */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Shopee</CardTitle>
                                <CardDescription>Configure o feed RSS do Shopee</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="shopeeAffiliate">Código de Afiliado</Label>
                                    <Input
                                        id="shopeeAffiliate"
                                        value={config.shopee.affiliateCode}
                                        onChange={(e) => setConfig({ ...config, shopee: { ...config.shopee, affiliateCode: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shopeeMinDiscount">Desconto Mínimo (%)</Label>
                                    <Input
                                        id="shopeeMinDiscount"
                                        type="number"
                                        value={config.shopee.minDiscount}
                                        onChange={(e) => setConfig({ ...config, shopee: { ...config.shopee, minDiscount: parseInt(e.target.value) || 0 } })}
                                    />
                                </div>

                                <div className="space-y-2 pt-2">
                                    <Label>Feeds RSS Shopee</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://shopee.com.br/feed..."
                                            value={newShopeeFeed}
                                            onChange={(e) => setNewShopeeFeed(e.target.value)}
                                        />
                                        <Button onClick={addShopeeFeed} size="icon">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {(!config.shopee?.feedUrls || config.shopee.feedUrls.length === 0) && (
                                            <p className="text-sm text-muted-foreground italic">Nenhum feed configurado</p>
                                        )}
                                        {(config.shopee?.feedUrls || []).map((url, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md text-sm">
                                                <span className="truncate flex-1 mr-2">{url}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:text-destructive/80"
                                                    onClick={() => removeShopeeFeed(index)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Collection Settings */}
                    <TabsContent value="collection">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configurações de Coleta</CardTitle>
                                <CardDescription>
                                    Configure o comportamento da coleta de ofertas (em breve)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium flex items-center gap-2">
                                        <Rss className="w-4 h-4" /> Feeds RSS Gerais
                                    </h3>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://exemplo.com/rss..."
                                            value={newRssFeed}
                                            onChange={(e) => setNewRssFeed(e.target.value)}
                                        />
                                        <Button onClick={addRssFeed} size="icon">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {(!config.rss || config.rss.length === 0) && (
                                            <p className="text-sm text-muted-foreground italic">Nenhum feed RSS configurado</p>
                                        )}
                                        {(config.rss || []).map((url, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md text-sm">
                                                <span className="truncate flex-1 mr-2">{url}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:text-destructive/80"
                                                    onClick={() => removeRssFeed(index)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Adicione URLs de feeds RSS de sites de promoções (ex: Pelando, Promobit) para coletar ofertas automaticamente.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
};

export default Settings;
