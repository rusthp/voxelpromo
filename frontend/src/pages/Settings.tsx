import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { ConfigState, MlAuthStatus, AutomationStatus } from "@/types/settings";
import { getErrorMessage, isTokenExpiredError, isMissingConfigError } from "@/utils/errorHandler";
import {
    AutomationSettings,
    AISettings,
    MessagingSettings,
    AffiliateSettings,
    CollectionSettings,
    TemplatesSettings,
} from "@/components/settings";
import { AffiliateNetworksCard } from "@/components/settings/AffiliateNetworksCard";
import { SubscriptionManager } from "@/components/billing/SubscriptionManager";
import { FiltersSettings } from "@/components/settings/FiltersSettings";

// Initial config state
const initialConfig: ConfigState = {
    ai: {
        provider: "groq",
        groqApiKey: "",
        openaiApiKey: "",
    },
    telegram: {
        botToken: "",
        chatId: "",
    },
    whatsapp: {
        enabled: false,
        targetNumber: "",
        targetGroups: [],
        library: "baileys",
    },
    x: {
        bearerToken: "",
        apiKey: "",
        apiKeySecret: "",
        accessToken: "",
        accessTokenSecret: "",
    },
    amazon: {
        accessKey: "",
        secretKey: "",
        associateTag: "",
        region: "sa-east-1",
    },
    aliexpress: {
        appKey: "",
        appSecret: "",
        trackingId: "",
    },
    mercadolivre: {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        affiliateCode: "",
        sessionCookies: "",
        csrfToken: "",
        affiliateTag: "",
    },
    shopee: {
        feedUrls: [],
        affiliateCode: "",
        minDiscount: 0,
    },
    awin: {
        enabled: false,
        apiToken: "",
        publisherId: "",
        dataFeedApiKey: "",
    },
    lomadee: {
        enabled: false,
        appToken: "",
        sourceId: "",
    },
    afilio: {
        enabled: false,
        apiToken: "",
    },
    rakuten: {
        enabled: false,
        clientId: "",
        clientSecret: "",
        sid: "",
    },
    instagram: {
        appId: "",
        appSecret: "",
        accessToken: "",
        pageId: "",
        igUserId: "",
        webhookVerifyToken: "",
    },
    automation: {
        isActive: false,
        startHour: 8,
        endHour: 22,
        intervalMinutes: 30,
        enabledChannels: ["telegram"],
        minDiscount: 20,
        maxPrice: 0,
        postsPerHour: 0,
    },
    collection: {
        sources: ["amazon", "aliexpress", "mercadolivre", "shopee", "awin", "lomadee", "rss"],
        enabled: true,
        schedule: "0 */6 * * *",
    },
    rss: [],
};

const Settings = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => {
        const tabFromUrl = searchParams.get('tab');
        const validTabs = ['automation', 'ai', 'messaging', 'affiliate', 'templates', 'subscription'];
        return validTabs.includes(tabFromUrl || '') ? tabFromUrl! : 'automation';
    });

    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);
    const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({ isActive: false, shouldPost: false });
    const [newShopeeFeed, setNewShopeeFeed] = useState("");
    const [newRssFeed, setNewRssFeed] = useState("");

    // Mercado Livre OAuth state
    const [mlAuthStatus, setMlAuthStatus] = useState<MlAuthStatus>({
        authenticated: false,
        hasRefreshToken: false,
        isExpired: false,
        expiresIn: 0,
        expiresAt: null,
        loading: true,
    });
    const [mlOAuthLoading, setMlOAuthLoading] = useState(false);
    const [mlOAuthCode, setMlOAuthCode] = useState("");
    const [mlCustomUrl, setMlCustomUrl] = useState("");
    const [mlScraping, setMlScraping] = useState(false);

    // Amazon scraping state
    const [amazonCustomUrl, setAmazonCustomUrl] = useState("");
    const [amazonScraping, setAmazonScraping] = useState(false);

    const [config, setConfig] = useState<ConfigState>(initialConfig);

    // Timer refs for cleanup
    const oauthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const oauthTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle tab change - update URL param
    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setSearchParams({ tab: value });
    };

    useEffect(() => {
        fetchConfig();
        fetchAutomationStatus();
        fetchMlAuthStatus();

        // 1. POPUP LOGIC: Detect if we are the popup with a code
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code && typeof window !== 'undefined' && window.opener) {
            console.log("OAuth Code detected in popup. Sending to opener...", code);
            window.opener.postMessage({ type: 'ML_AUTH_SUCCESS', code }, window.location.origin);
            window.close();
            return; // Stop further execution
        }

        // 2. OPENER LOGIC: Listen for the code from the popup
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'ML_AUTH_SUCCESS' && event.data.code) {
                console.log("Received OAuth Code from popup:", event.data.code);
                setMlOAuthCode(event.data.code);
                // Trigger exchange automatically
                exchangeMlOAuthCode(event.data.code);
            }
        };
        window.addEventListener('message', handleMessage);

        // Cleanup function
        return () => {
            window.removeEventListener('message', handleMessage);
            if (oauthCheckIntervalRef.current) {
                clearInterval(oauthCheckIntervalRef.current);
            }
            if (oauthTimeoutRef.current) {
                clearTimeout(oauthTimeoutRef.current);
            }
        };
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/config');
            console.log("Config loaded:", response.data);

            setConfig(prev => {
                const newConfig = {
                    ...prev,
                    ...response.data,
                    whatsapp: {
                        ...prev.whatsapp,
                        ...(response.data.whatsapp || {}),
                        targetGroups: response.data.whatsapp?.targetGroups || prev.whatsapp.targetGroups || []
                    },
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
        } catch (error) {
            console.error("Error fetching ML auth status:", error);
            setMlAuthStatus(prev => ({
                ...prev,
                loading: false,
                authenticated: false,
                error: getErrorMessage(error, "Erro ao verificar status"),
            }));
        }
    };

    const startMlOAuth = async () => {
        try {
            setMlOAuthLoading(true);

            // Auto-save settings first to ensure backend has the latest Client ID
            try {
                // We only need to save the main config for ML
                await api.post('/config', config);
                toast.success("Configurações salvas automaticamente.");
            } catch (saveError) {
                console.error("Auto-save failed:", saveError);
                toast.error("Erro ao salvar configurações antes da conexão.");
                setMlOAuthLoading(false);
                return;
            }

            const response = await api.get('/mercadolivre/auth/url');

            if (response.data?.authUrl) {
                const width = 600;
                const height = 700;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;

                const authWindow = window.open(
                    response.data.authUrl,
                    'MercadoLivreAuth',
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                );

                // Clear any existing timers
                if (oauthCheckIntervalRef.current) {
                    clearInterval(oauthCheckIntervalRef.current);
                }
                if (oauthTimeoutRef.current) {
                    clearTimeout(oauthTimeoutRef.current);
                }

                // Poll for window close
                oauthCheckIntervalRef.current = setInterval(() => {
                    if (authWindow?.closed) {
                        if (oauthCheckIntervalRef.current) {
                            clearInterval(oauthCheckIntervalRef.current);
                            oauthCheckIntervalRef.current = null;
                        }
                        setMlOAuthLoading(false);
                        fetchMlAuthStatus();
                        toast.info("Verifique se a autenticação foi concluída.");
                    }
                }, 500);

                // Timeout after 5 minutes
                oauthTimeoutRef.current = setTimeout(() => {
                    if (oauthCheckIntervalRef.current) {
                        clearInterval(oauthCheckIntervalRef.current);
                        oauthCheckIntervalRef.current = null;
                    }
                    oauthTimeoutRef.current = null;
                    setMlOAuthLoading(false);
                }, 5 * 60 * 1000);
            }
        } catch (error) {
            console.error("Error starting OAuth:", error);
            toast.error(getErrorMessage(error, "Erro ao iniciar autenticação."));
            setMlOAuthLoading(false);
        }
    };

    const refreshMlToken = async () => {
        try {
            setMlOAuthLoading(true);
            await api.post('/mercadolivre/auth/refresh');
            toast.success("Token renovado com sucesso!");
            await fetchMlAuthStatus();
        } catch (error) {
            console.error("Error refreshing token:", error);
            toast.error(getErrorMessage(error, "Erro ao renovar token."));
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
        } catch (error) {
            console.error("Error testing ML:", error);
            toast.error(getErrorMessage(error, "Erro ao testar conexão."));
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
        if (input.includes('code=')) {
            try {
                const url = new URL(input);
                return url.searchParams.get('code') || '';
            } catch {
                const match = input.match(/code=([^&]+)/);
                return match ? match[1] : '';
            }
        }
        return input.trim();
    };

    const exchangeMlOAuthCode = async (directCode?: string) => {
        const code = directCode || extractOAuthCode(mlOAuthCode);

        if (!code) {
            toast.error("Cole a URL completa ou o código de autorização.");
            return;
        }

        try {
            setMlOAuthLoading(true);
            const response = await api.post('/mercadolivre/auth/exchange', { code });

            if (response.data?.success) {
                toast.success("🎉 Token obtido com sucesso! Conectado ao Mercado Livre.");
                setMlOAuthCode("");
                await fetchMlAuthStatus();
            } else {
                toast.error(response.data?.error || "Erro ao trocar código por token.");
            }
        } catch (error) {
            console.error("Error exchanging OAuth code:", error);
            const errorMsg = getErrorMessage(error, "Erro ao trocar código por token.");

            if (isTokenExpiredError(error)) {
                toast.error("⚠️ Código expirado ou já usado. Por favor, conecte novamente.");
            } else if (isMissingConfigError(error)) {
                toast.error("⚠️ Configure o Client ID e Client Secret primeiro.");
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setMlOAuthLoading(false);
        }
    };

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
                setMlCustomUrl("");
            } else {
                toast.error(response.data?.error || "Erro na coleta.");
            }
        } catch (error) {
            console.error("Error scraping URL:", error);
            toast.error(getErrorMessage(error, "Erro ao coletar produtos."));
        } finally {
            setMlScraping(false);
        }
    };

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
                const { product } = response.data;
                toast.success(`✅ Produto coletado: ${product?.title?.substring(0, 50)}...`);
                setAmazonCustomUrl("");
            } else {
                toast.error(response.data?.error || "Erro na coleta.");
            }
        } catch (error) {
            console.error("Error scraping Amazon URL:", error);
            toast.error(getErrorMessage(error, "Erro ao coletar produto da Amazon."));
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
            console.log("Saving configs in parallel...");

            // Make both saves in parallel instead of sequential
            const [configResult, automationResult] = await Promise.allSettled([
                api.post('/config', config),
                api.post('/automation/config', config.automation)
            ]);

            // Check results
            if (configResult.status === 'rejected') {
                console.error("Error saving main config:", configResult.reason);
                toast.error("Erro ao salvar configurações principais.");
                return;
            }

            if (automationResult.status === 'rejected') {
                console.warn("Error saving automation config:", automationResult.reason);
                toast.warning("Configurações salvas, mas houve erro na automação.");
            }

            toast.success("Configurações salvas com sucesso!");
            console.log("All configs saved.");

            // DON'T refetch immediately - the UI already has the latest state
            // This was causing extra lag. Only refetch if user navigates away and back.
        } catch (error) {
            console.error("Error saving config:", error);
            toast.error(getErrorMessage(error, "Erro ao salvar configurações."));
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
        } catch (error) {
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

            // If starting, save the current config first to ensure it exists in the database
            if (action === 'start') {
                await api.post('/automation/config', config.automation);
            }

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

    // Feed management helpers
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

                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <TabsList className="flex flex-wrap w-full h-auto gap-2 bg-transparent justify-start p-0">
                        <TabsTrigger value="automation">Automação</TabsTrigger>
                        <TabsTrigger value="ai">IA</TabsTrigger>
                        <TabsTrigger value="messaging">Mensageria</TabsTrigger>
                        <TabsTrigger value="affiliate">Afiliados & Coleta</TabsTrigger>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                        <TabsTrigger value="filters">Filtros</TabsTrigger>
                        <TabsTrigger value="subscription">Assinatura</TabsTrigger>
                    </TabsList>

                    <TabsContent value="automation">
                        <AutomationSettings
                            config={config}
                            setConfig={setConfig}
                            loading={loading}
                            onToggleAutomation={toggleAutomation}
                            automationStatus={automationStatus}
                        />
                    </TabsContent>

                    <TabsContent value="ai">
                        <AISettings
                            config={config}
                            setConfig={setConfig}
                        />
                    </TabsContent>

                    <TabsContent value="messaging" className="space-y-6">
                        <MessagingSettings
                            config={config}
                            setConfig={setConfig}
                            testing={testing}
                            onTest={handleTest}
                        />
                    </TabsContent>

                    <TabsContent value="affiliate" className="space-y-6">
                        <CollectionSettings
                            config={config}
                            setConfig={setConfig}
                            newRssFeed={newRssFeed}
                            setNewRssFeed={setNewRssFeed}
                            onAddRssFeed={addRssFeed}
                            onRemoveRssFeed={removeRssFeed}
                        />

                        <AffiliateSettings
                            config={config}
                            setConfig={setConfig}
                            testing={testing}
                            onTest={handleTest}
                            mlAuthStatus={mlAuthStatus}
                            mlOAuthLoading={mlOAuthLoading}
                            mlOAuthCode={mlOAuthCode}
                            setMlOAuthCode={setMlOAuthCode}
                            mlCustomUrl={mlCustomUrl}
                            setMlCustomUrl={setMlCustomUrl}
                            mlScraping={mlScraping}
                            onStartMlOAuth={startMlOAuth}
                            onRefreshMlToken={refreshMlToken}
                            onTestMlConnection={testMlConnection}
                            onExchangeMlOAuthCode={exchangeMlOAuthCode}
                            onScrapeCustomUrl={scrapeCustomUrl}
                            formatExpiresIn={formatExpiresIn}
                            amazonCustomUrl={amazonCustomUrl}
                            setAmazonCustomUrl={setAmazonCustomUrl}
                            amazonScraping={amazonScraping}
                            onScrapeAmazonUrl={scrapeAmazonUrl}
                            newShopeeFeed={newShopeeFeed}
                            setNewShopeeFeed={setNewShopeeFeed}
                            onAddShopeeFeed={addShopeeFeed}
                            onRemoveShopeeFeed={removeShopeeFeed}
                        />

                        {/* Affiliate Networks: Awin, Lomadee, Afilio, Rakuten */}
                        <AffiliateNetworksCard
                            config={config}
                            setConfig={setConfig}
                            testing={testing}
                            onTest={handleTest}
                        />
                    </TabsContent>

                    <TabsContent value="templates">
                        <TemplatesSettings />
                    </TabsContent>

                    <TabsContent value="filters">
                        <FiltersSettings />
                    </TabsContent>

                    <TabsContent value="subscription">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground mb-2">Gerenciar Assinatura</h2>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Veja o status da sua assinatura, data de renovação e gerencie seu plano.
                                </p>
                            </div>
                            <SubscriptionManager />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
};

export default Settings;
