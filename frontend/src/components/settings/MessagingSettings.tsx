import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, TestTube2 } from "lucide-react";
import { FaTelegram, FaWhatsapp } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";
import { ConfigState } from "@/types/settings";
import { WHATSAPP_LIBRARIES } from "@/constants/channels";
import { InstagramSettings } from "./InstagramSettings";


interface MessagingSettingsProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
    testing: string | null;
    onTest: (service: string) => void;
}

import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

// ... existing imports ...

// Instagram status interface
interface InstagramStatus {
    configured: boolean;
    authenticated: boolean;
    account?: {
        id: string;
        username: string;
        name?: string;
    };
    rateLimit?: {
        remaining: number;
        total: number;
        resetsIn: number;
    };
}

// Instagram Card Component
function InstagramCard({ config, setConfig, testing, onTest }: MessagingSettingsProps) {
    const [instagramStatus, setInstagramStatus] = useState<InstagramStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [showManualToken, setShowManualToken] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [manualIgUserId, setManualIgUserId] = useState('');
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Fetch Instagram status
    const fetchInstagramStatus = async () => {
        try {
            const response = await api.get('/instagram/status');
            if (response.data.success) {
                setInstagramStatus(response.data);
                // If authenticated, stop polling
                if (response.data.authenticated) {
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                        checkIntervalRef.current = null;
                    }
                    if (connecting) {
                        setConnecting(false);
                        toast.success("Instagram conectado com sucesso!");
                    }
                }
                return response.data;
            }
        } catch (error) {
            console.error("Error fetching Instagram status:", error);
        }
        return null;
    };

    // Fetch status on mount
    useEffect(() => {
        fetchInstagramStatus();
    }, []);

    // Cancel OAuth process
    const handleCancelConnect = () => {
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setConnecting(false);
        toast.info("Processo de conexão cancelado.");
    };

    // Handle OAuth connect
    const handleConnect = async () => {
        try {
            setConnecting(true);
            const response = await api.get('/instagram/auth/url');

            if (response.data?.authUrl) {
                const width = 600;
                const height = 700;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;

                const authWindow = window.open(
                    response.data.authUrl,
                    'InstagramAuth',
                    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
                );

                // Clear any previous intervals
                if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);

                // Poll for completion
                checkIntervalRef.current = setInterval(async () => {
                    const status = await fetchInstagramStatus();
                    // fetchInstagramStatus now handles the success case

                    // Also check if window was closed
                    if (authWindow?.closed && !status?.authenticated) {
                        // Window closed but not authenticated - user might have cancelled
                        // Continue polling for a bit in case callback is still processing
                    }
                }, 3000);

                // Timeout after 5 minutes
                timeoutRef.current = setTimeout(() => {
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                        checkIntervalRef.current = null;
                    }
                    setConnecting(false);
                    toast.warning("Tempo limite atingido. Tente novamente.");
                }, 5 * 60 * 1000);
            } else {
                setConnecting(false);
                toast.error("Não foi possível obter URL de autenticação.");
            }
        } catch (error: any) {
            console.error("Error starting Instagram OAuth:", error);
            toast.error(error.response?.data?.error || "Erro ao iniciar autenticação.");
            setConnecting(false);
        }
    };

    // Handle disconnect
    const handleDisconnect = async () => {
        try {
            setLoading(true);
            await api.post('/instagram/auth/disconnect');
            setInstagramStatus(null);
            toast.success("Instagram desconectado.");
            await fetchInstagramStatus();
        } catch (error: any) {
            console.error("Error disconnecting Instagram:", error);
            toast.error("Erro ao desconectar.");
        } finally {
            setLoading(false);
        }
    };

    // Handle test
    const handleTest = async () => {
        try {
            onTest('instagram');
            const response = await api.post('/instagram/test');
            if (response.data.success) {
                toast.success(response.data.message || "Conexão verificada!");
            } else {
                toast.error(response.data.error || "Falha na verificação.");
            }
        } catch (error: any) {
            console.error("Error testing Instagram:", error);
            toast.error(error.response?.data?.error || "Erro ao testar.");
        }
    };

    // Handle config save
    const handleConfigSave = async () => {
        try {
            setLoading(true);
            await api.post('/instagram/config', {
                appId: config.instagram?.appId,
                appSecret: config.instagram?.appSecret,
                webhookVerifyToken: config.instagram?.webhookVerifyToken,
            });
            toast.success("Configuração salva.");
            await fetchInstagramStatus();
        } catch (error: any) {
            console.error("Error saving Instagram config:", error);
            toast.error("Erro ao salvar configuração.");
        } finally {
            setLoading(false);
        }
    };

    // Handle manual token save
    const handleManualTokenSave = async () => {
        if (!manualToken || !manualIgUserId) {
            toast.error("Preencha o Access Token e o IG User ID.");
            return;
        }

        try {
            setLoading(true);
            await api.post('/instagram/config', {
                accessToken: manualToken,
                igUserId: manualIgUserId,
            });
            toast.success("Token salvo com sucesso!");
            setManualToken('');
            setManualIgUserId('');
            setShowManualToken(false);
            await fetchInstagramStatus();
        } catch (error: any) {
            console.error("Error saving manual token:", error);
            toast.error(error.response?.data?.error || "Erro ao salvar token.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                            <defs>
                                <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#FFDC80" />
                                    <stop offset="25%" stopColor="#F77737" />
                                    <stop offset="50%" stopColor="#E1306C" />
                                    <stop offset="75%" stopColor="#C13584" />
                                    <stop offset="100%" stopColor="#833AB4" />
                                </linearGradient>
                            </defs>
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        Instagram
                        {instagramStatus?.authenticated && (
                            <span className="ml-2 text-xs text-green-500 font-normal">
                                @{instagramStatus.account?.username}
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>Configure o Instagram para automação de comentários e DMs</CardDescription>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={testing === 'instagram' || !instagramStatus?.authenticated}
                    className="gap-2"
                >
                    {testing === 'instagram' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                    Testar
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* App Credentials */}
                <div className="space-y-2">
                    <Label htmlFor="instagramAppId">App ID (Meta Developer)</Label>
                    <Input
                        id="instagramAppId"
                        type="password"
                        value={config.instagram?.appId || ''}
                        onChange={(e) => setConfig({
                            ...config,
                            instagram: {
                                ...config.instagram || { appId: '', appSecret: '', accessToken: '', pageId: '', igUserId: '', webhookVerifyToken: '' },
                                appId: e.target.value
                            }
                        })}
                        placeholder="Seu App ID do Meta Developer"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="instagramAppSecret">App Secret</Label>
                    <Input
                        id="instagramAppSecret"
                        type="password"
                        value={config.instagram?.appSecret || ''}
                        onChange={(e) => setConfig({
                            ...config,
                            instagram: {
                                ...config.instagram || { appId: '', appSecret: '', accessToken: '', pageId: '', igUserId: '', webhookVerifyToken: '' },
                                appSecret: e.target.value
                            }
                        })}
                        placeholder="Seu App Secret"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="instagramWebhookToken">Webhook Verify Token (opcional)</Label>
                    <Input
                        id="instagramWebhookToken"
                        value={config.instagram?.webhookVerifyToken || ''}
                        onChange={(e) => setConfig({
                            ...config,
                            instagram: {
                                ...config.instagram || { appId: '', appSecret: '', accessToken: '', pageId: '', igUserId: '', webhookVerifyToken: '' },
                                webhookVerifyToken: e.target.value
                            }
                        })}
                        placeholder="Token para verificação de webhook"
                    />
                    <p className="text-xs text-muted-foreground">
                        Use este token ao configurar o webhook no Meta Developer Portal.
                    </p>
                </div>

                {/* Manual Token Option */}
                <div className="mt-4 p-3 border border-dashed rounded-lg">
                    <button
                        type="button"
                        onClick={() => setShowManualToken(!showManualToken)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                        <span className={`transform transition-transform ${showManualToken ? 'rotate-90' : ''}`}>▶</span>
                        <span>Usar Token Manual (já tenho um token)</span>
                    </button>

                    {showManualToken && (
                        <div className="mt-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Cole o Access Token e IG User ID que você gerou diretamente no Meta Developer Portal.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="manualAccessToken">Access Token</Label>
                                <Input
                                    id="manualAccessToken"
                                    type="password"
                                    value={manualToken}
                                    onChange={(e) => setManualToken(e.target.value)}
                                    placeholder="IGAAKDG..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="manualIgUserId">IG User ID</Label>
                                <Input
                                    id="manualIgUserId"
                                    value={manualIgUserId}
                                    onChange={(e) => setManualIgUserId(e.target.value)}
                                    placeholder="17841478596546817"
                                />
                            </div>
                            <Button
                                onClick={handleManualTokenSave}
                                disabled={loading || !manualToken || !manualIgUserId}
                                className="w-full"
                            >
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Salvar Token Manual
                            </Button>
                        </div>
                    )}
                </div>
                <div className="mt-4 p-4 border rounded-lg bg-secondary/20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${instagramStatus?.authenticated ? 'bg-green-500' : instagramStatus?.configured ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                            <span className="font-medium">
                                {instagramStatus?.authenticated ? 'Conectado' : instagramStatus?.configured ? 'Configurado (não conectado)' : 'Não configurado'}
                            </span>
                        </div>

                        {instagramStatus?.authenticated && instagramStatus.account && (
                            <div className="text-sm text-center">
                                <p className="font-medium">@{instagramStatus.account.username}</p>
                                {instagramStatus.account.name && (
                                    <p className="text-muted-foreground">{instagramStatus.account.name}</p>
                                )}
                            </div>
                        )}

                        {instagramStatus?.rateLimit && (
                            <div className="text-xs text-muted-foreground text-center">
                                Rate Limit: {instagramStatus.rateLimit.remaining}/{instagramStatus.rateLimit.total} restantes
                            </div>
                        )}

                        <div className="flex gap-2 flex-wrap justify-center">
                            {!instagramStatus?.authenticated ? (
                                <>
                                    <Button
                                        onClick={handleConfigSave}
                                        variant="outline"
                                        disabled={loading || connecting || !config.instagram?.appId}
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                        Salvar Credenciais
                                    </Button>
                                    {connecting ? (
                                        <Button
                                            onClick={handleCancelConnect}
                                            variant="outline"
                                            className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                                        >
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Cancelar
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleConnect}
                                            disabled={!instagramStatus?.configured}
                                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                        >
                                            Conectar com Instagram
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button
                                    onClick={handleDisconnect}
                                    variant="destructive"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Desconectar
                                </Button>
                            )}
                        </div>

                        {!instagramStatus?.configured && (
                            <p className="text-xs text-muted-foreground text-center">
                                💡 Primeiro, configure suas credenciais do Meta Developer acima.
                            </p>
                        )}
                    </div>
                </div>

                {/* Personalization Settings - Only show when connected */}
                {instagramStatus?.authenticated && (
                    <div className="mt-6 pt-6 border-t">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                            <span>⚙️</span>
                            Personalização de Mensagens
                        </h4>

                        {/* Enable Instagram */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <Label className="text-base">Habilitar Instagram</Label>
                                <p className="text-sm text-muted-foreground">Ativar/desativar canal Instagram</p>
                            </div>
                            <Switch
                                checked={config.instagram?.enabled !== false}
                                onCheckedChange={async (checked) => {
                                    try {
                                        await api.post('/instagram/settings', { enabled: checked });
                                        setConfig({
                                            ...config,
                                            instagram: { ...config.instagram!, enabled: checked }
                                        });
                                        toast.success(checked ? "Instagram habilitado" : "Instagram desabilitado");
                                    } catch (error) {
                                        toast.error("Erro ao atualizar configuração");
                                    }
                                }}
                            />
                        </div>

                        {/* Auto-reply DMs */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <Label className="text-base">Auto-responder DMs</Label>
                                <p className="text-sm text-muted-foreground">Responder automaticamente mensagens diretas</p>
                            </div>
                            <Switch
                                checked={config.instagram?.autoReplyDM !== false}
                                onCheckedChange={async (checked) => {
                                    try {
                                        await api.post('/instagram/settings', { autoReplyDM: checked });
                                        setConfig({
                                            ...config,
                                            instagram: { ...config.instagram!, autoReplyDM: checked }
                                        });
                                        toast.success(checked ? "Auto-resposta ativada" : "Auto-resposta desativada");
                                    } catch (error) {
                                        toast.error("Erro ao atualizar configuração");
                                    }
                                }}
                            />
                        </div>

                        {/* Welcome Message */}
                        <div className="space-y-2 mb-4">
                            <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
                            <textarea
                                id="welcomeMessage"
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={config.instagram?.welcomeMessage || 'Olá! 👋 Obrigado por entrar em contato!\n\nConfira nossas melhores ofertas com descontos imperdíveis! 🔥\n\nDigite "ofertas" para ver as promoções mais recentes.'}
                                onChange={(e) => setConfig({
                                    ...config,
                                    instagram: { ...config.instagram!, welcomeMessage: e.target.value }
                                })}
                                placeholder="Digite a mensagem que será enviada quando alguém entrar em contato..."
                            />
                            <p className="text-xs text-muted-foreground">
                                💡 Dica: mencione que o usuário pode digitar "ofertas" para ver promoções!
                            </p>
                        </div>

                        {/* Save Settings Button */}
                        <Button
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    await api.post('/instagram/settings', {
                                        welcomeMessage: config.instagram?.welcomeMessage,
                                    });
                                    toast.success("Configurações salvas com sucesso!");
                                } catch (error) {
                                    toast.error("Erro ao salvar configurações");
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Salvar Configurações
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function MessagingSettings({ config, setConfig, testing, onTest }: MessagingSettingsProps) {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<string>("");
    const [isReady, setIsReady] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Telegram state
    const [telegramChats, setTelegramChats] = useState<any[]>([]);
    const [loadingTelegramChats, setLoadingTelegramChats] = useState(false);
    const [telegramBotStatus, setTelegramBotStatus] = useState<any>(null);

    // Fetch Telegram chats
    const fetchTelegramChats = async () => {
        setLoadingTelegramChats(true);
        try {
            const response = await api.get('/telegram/chats');
            if (response.data.success) {
                setTelegramChats(response.data.chats || []);
            }
        } catch (error) {
            console.error("Error fetching Telegram chats:", error);
        } finally {
            setLoadingTelegramChats(false);
        }
    };

    // Fetch Telegram bot status
    const fetchTelegramStatus = async () => {
        try {
            const response = await api.get('/telegram/status');
            setTelegramBotStatus(response.data);
            if (response.data.success && response.data.configured) {
                fetchTelegramChats();
            }
        } catch (error) {
            console.error("Error fetching Telegram status:", error);
        }
    };

    // Fetch Telegram status on mount
    useEffect(() => {
        fetchTelegramStatus();
    }, []);

    // Fetch WhatsApp status on mount (to show current connection state)
    useEffect(() => {
        if (config.whatsapp.enabled) {
            fetchWhatsAppStatus();
        }
    }, [config.whatsapp.enabled]);

    // Fetch groups when connected
    useEffect(() => {
        if (isReady) {
            fetchGroups();
        }
    }, [isReady]);

    const fetchGroups = async () => {
        try {
            const response = await api.get('/whatsapp/groups');
            if (response.data.success) {
                setGroups(response.data.groups);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        }
    };

    // Clean up polling on unmount
    useEffect(() => {
        return () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, []);

    const fetchWhatsAppStatus = async () => {
        try {
            const response = await api.get('/whatsapp/status');
            const { isReady, qrCodeDataURL, message } = response.data;

            setIsReady(isReady);
            setConnectionStatus(message);

            if (qrCodeDataURL) {
                setQrCode(qrCodeDataURL);
            } else if (isReady) {
                setQrCode(null);
            }

            return isReady;
        } catch (error) {
            console.error("Error fetching WhatsApp status:", error);
            return false;
        }
    };

    const handleConnectWhatsApp = async () => {
        setIsConnecting(true);
        setQrCode(null);
        setConnectionStatus("Inicializando...");

        try {
            // First check status
            const ready = await fetchWhatsAppStatus();
            if (ready) {
                setIsConnecting(false);
                toast.success("WhatsApp já está conectado!");
                return;
            }

            // Trigger initialization
            await api.post('/whatsapp/initialize');
            toast.info("Gerando QR Code...");

            // Start polling
            if (pollInterval.current) clearInterval(pollInterval.current);

            pollInterval.current = setInterval(async () => {
                const ready = await fetchWhatsAppStatus();
                if (ready) {
                    if (pollInterval.current) clearInterval(pollInterval.current);
                    setIsConnecting(false);
                    toast.success("WhatsApp conectado com sucesso!");
                }
            }, 2000); // Poll every 2 seconds

        } catch (error) {
            console.error("Error connecting WhatsApp:", error);
            toast.error("Erro ao conectar WhatsApp via API.");
            setIsConnecting(false);
        }
    };

    const handleDisconnectWhatsApp = async () => {
        try {
            await api.delete('/whatsapp/auth');
            setQrCode(null);
            setIsReady(false);
            setConnectionStatus("Desconectado.");
            toast.success("Sessão desconectada. Gere um novo QR Code.");
        } catch (error) {
            console.error("Error disconnecting WhatsApp:", error);
            toast.error("Erro ao desconectar.");
        }
    };

    const [testingWhatsApp, setTestingWhatsApp] = useState(false);

    const handleTestWhatsApp = async () => {
        try {
            setTestingWhatsApp(true);
            const response = await api.post('/whatsapp/test');
            if (response.data.success) {
                toast.success(response.data.message || "Mensagem de teste enviada!");
            } else {
                toast.error(response.data.error || "Erro ao enviar teste.");
            }
        } catch (error: any) {
            console.error("Error testing WhatsApp:", error);
            toast.error(error.response?.data?.error || "Erro ao testar WhatsApp.");
        } finally {
            setTestingWhatsApp(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Telegram */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FaTelegram className="w-5 h-5 text-[#0088cc]" />
                            Telegram
                            {telegramBotStatus?.configured && (
                                <span className="ml-2 text-xs text-green-500 font-normal">@{telegramBotStatus.botUsername}</span>
                            )}
                        </CardTitle>
                        <CardDescription>Configure o bot do Telegram para enviar ofertas</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTest('telegram')}
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
                        <div className="flex justify-between items-center">
                            <Label htmlFor="telegramChatId">Chat ID / Grupo</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={fetchTelegramChats}
                                disabled={loadingTelegramChats}
                            >
                                {loadingTelegramChats ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                Buscar grupos
                            </Button>
                        </div>
                        <Input
                            id="telegramChatId"
                            value={config.telegram.chatId}
                            onChange={(e) => setConfig({ ...config, telegram: { ...config.telegram, chatId: e.target.value } })}
                            placeholder="@canal ou -100..."
                        />
                        {telegramChats.length > 0 && (
                            <div className="mt-2 text-sm bg-muted p-3 rounded-md border">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        Grupos Detectados
                                    </p>
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {telegramChats.map((chat) => (
                                        <div
                                            key={chat.id}
                                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${config.telegram.chatId === chat.id ? 'bg-primary/10 border-primary/30' : 'hover:bg-background border-transparent hover:border-border'}`}
                                            onClick={() => setConfig({ ...config, telegram: { ...config.telegram, chatId: chat.id } })}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.telegram.chatId === chat.id ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                                {config.telegram.chatId === chat.id && <span className="text-primary-foreground text-[10px]">✓</span>}
                                            </div>
                                            <div className="flex flex-col overflow-hidden flex-1">
                                                <span className="font-medium text-xs truncate">{chat.title}</span>
                                                <span className="text-[10px] text-muted-foreground">{chat.type} • {chat.id}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {telegramChats.length === 0 && telegramBotStatus?.configured && (
                            <p className="text-xs text-muted-foreground mt-1">
                                💡 Para descobrir grupos: adicione o bot ao grupo e envie uma mensagem.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FaWhatsapp className="w-5 h-5 text-[#25D366]" />
                            WhatsApp
                        </CardTitle>
                        <CardDescription>Configure o WhatsApp para enviar mensagens</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestWhatsApp}
                        disabled={testingWhatsApp || !isReady}
                        className="gap-2"
                    >
                        {testingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                        Testar
                    </Button>
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
                                {isReady && groups.length > 0 && (
                                    <div className="mt-2 text-sm bg-muted p-3 rounded-md border">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-medium flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                Grupos Detectados
                                            </p>
                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={fetchGroups}>Atualizar</Button>
                                        </div>
                                        <div className="space-y-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                                            {groups.map((group) => {
                                                const isSelected = config.whatsapp.targetGroups?.includes(group.id) || config.whatsapp.targetNumber === group.id;
                                                return (
                                                    <div
                                                        key={group.id}
                                                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-background border-transparent hover:border-border'}`}
                                                        onClick={() => {
                                                            let newGroups = [...(config.whatsapp.targetGroups || [])];

                                                            // If targetNumber is set but not in targetGroups, add it first
                                                            if (config.whatsapp.targetNumber && !newGroups.includes(config.whatsapp.targetNumber)) {
                                                                newGroups.push(config.whatsapp.targetNumber);
                                                            }

                                                            if (isSelected) {
                                                                newGroups = newGroups.filter(id => id !== group.id);
                                                            } else {
                                                                newGroups.push(group.id);
                                                            }

                                                            // Update both targetGroups and targetNumber (for backward compatibility, use last selected or first available)
                                                            setConfig({
                                                                ...config,
                                                                whatsapp: {
                                                                    ...config.whatsapp,
                                                                    targetGroups: newGroups,
                                                                    targetNumber: newGroups.length > 0 ? newGroups[newGroups.length - 1] : ''
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <div className="mt-1">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                                                {isSelected && <span className="text-primary-foreground text-[10px]">✓</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="font-medium text-xs break-words">{group.name}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate">{group.id}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground text-right">
                                            {(config.whatsapp.targetGroups?.length || 0) > 0 ?
                                                `${config.whatsapp.targetGroups?.length || 0} grupo${(config.whatsapp.targetGroups?.length || 0) > 1 ? 's' : ''} selecionado${(config.whatsapp.targetGroups?.length || 0) > 1 ? 's' : ''}` :
                                                "Nenhum grupo selecionado"}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="whatsappLibrary">Biblioteca</Label>
                                <select
                                    id="whatsappLibrary"
                                    className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                                    value={config.whatsapp.library}
                                    onChange={(e) => setConfig({ ...config, whatsapp: { ...config.whatsapp, library: e.target.value } })}
                                >
                                    {WHATSAPP_LIBRARIES.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* WhatsApp Connection UI */}
                            <div className="mt-4 p-4 border rounded-lg bg-secondary/20">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                        <span className="font-medium">
                                            {isReady ? 'Conectado' : 'Desconectado'}
                                        </span>
                                    </div>

                                    {connectionStatus && <p className="text-sm text-muted-foreground text-center">{connectionStatus}</p>}

                                    {qrCode && !isReady && (
                                        <div className="bg-white p-2 rounded-lg">
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleConnectWhatsApp}
                                            disabled={isConnecting || isReady}
                                            variant="default"
                                            className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Conectando...
                                                </>
                                            ) : (
                                                "Conectar / Gerar QR"
                                            )}
                                        </Button>

                                        <Button
                                            onClick={handleDisconnectWhatsApp}
                                            variant="destructive"
                                            disabled={!isReady && !qrCode}
                                        >
                                            Desconectar / Limpar
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* WhatsApp Status Posting */}
                            {isReady && (
                                <div className="mt-6 pt-6 border-t">
                                    <h4 className="font-medium mb-4 flex items-center gap-2">
                                        <span>📱</span>
                                        Postar Status (Stories)
                                    </h4>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Text Status */}
                                        <div className="p-4 border rounded-lg space-y-3">
                                            <h5 className="font-medium text-sm flex items-center gap-2">
                                                📝 Status de Texto
                                            </h5>
                                            <div className="space-y-2">
                                                <Label>Texto</Label>
                                                <textarea
                                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    placeholder="Digite o texto do status..."
                                                    id="whatsapp-status-text"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Cor de Fundo</Label>
                                                <div className="flex gap-2">
                                                    {['#075e54', '#128C7E', '#25D366', '#34B7F1', '#ECE5DD'].map((color) => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            className="w-8 h-8 rounded-full border-2 border-transparent hover:border-gray-400"
                                                            style={{ backgroundColor: color }}
                                                            onClick={() => {
                                                                const input = document.getElementById('whatsapp-status-bg') as HTMLInputElement;
                                                                if (input) input.value = color;
                                                            }}
                                                        />
                                                    ))}
                                                    <input
                                                        type="color"
                                                        id="whatsapp-status-bg"
                                                        defaultValue="#075e54"
                                                        className="w-8 h-8 rounded cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                            <Button
                                                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                                                onClick={async () => {
                                                    const textEl = document.getElementById('whatsapp-status-text') as HTMLTextAreaElement;
                                                    const bgEl = document.getElementById('whatsapp-status-bg') as HTMLInputElement;
                                                    const text = textEl?.value;
                                                    if (!text) {
                                                        toast.error("Digite um texto para o status");
                                                        return;
                                                    }
                                                    try {
                                                        const response = await api.post('/whatsapp/status-post/text', {
                                                            text,
                                                            backgroundColor: bgEl?.value || '#075e54',
                                                        });
                                                        if (response.data.success) {
                                                            toast.success("Status de texto publicado!");
                                                            textEl.value = '';
                                                        } else {
                                                            toast.error(response.data.error || "Erro ao publicar");
                                                        }
                                                    } catch (error: any) {
                                                        toast.error(error.response?.data?.error || "Erro ao publicar status");
                                                    }
                                                }}
                                            >
                                                Publicar Status
                                            </Button>
                                        </div>

                                        {/* Image/Video Status */}
                                        <div className="p-4 border rounded-lg space-y-3">
                                            <h5 className="font-medium text-sm flex items-center gap-2">
                                                🖼️ Status de Mídia
                                            </h5>
                                            <div className="space-y-2">
                                                <Label>URL da Mídia</Label>
                                                <Input
                                                    id="whatsapp-status-media"
                                                    placeholder="https://exemplo.com/imagem.jpg"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Legenda (opcional)</Label>
                                                <Input
                                                    id="whatsapp-status-caption"
                                                    placeholder="Descrição..."
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white"
                                                    onClick={async () => {
                                                        const mediaEl = document.getElementById('whatsapp-status-media') as HTMLInputElement;
                                                        const captionEl = document.getElementById('whatsapp-status-caption') as HTMLInputElement;
                                                        const imageUrl = mediaEl?.value;
                                                        if (!imageUrl) {
                                                            toast.error("Informe a URL da imagem");
                                                            return;
                                                        }
                                                        try {
                                                            const response = await api.post('/whatsapp/status-post/image', {
                                                                imageUrl,
                                                                caption: captionEl?.value,
                                                            });
                                                            if (response.data.success) {
                                                                toast.success("Status de imagem publicado!");
                                                                mediaEl.value = '';
                                                                captionEl.value = '';
                                                            } else {
                                                                toast.error(response.data.error || "Erro ao publicar");
                                                            }
                                                        } catch (error: any) {
                                                            toast.error(error.response?.data?.error || "Erro ao publicar status");
                                                        }
                                                    }}
                                                >
                                                    📷 Imagem
                                                </Button>
                                                <Button
                                                    className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white"
                                                    onClick={async () => {
                                                        const mediaEl = document.getElementById('whatsapp-status-media') as HTMLInputElement;
                                                        const captionEl = document.getElementById('whatsapp-status-caption') as HTMLInputElement;
                                                        const videoUrl = mediaEl?.value;
                                                        if (!videoUrl) {
                                                            toast.error("Informe a URL do vídeo");
                                                            return;
                                                        }
                                                        try {
                                                            const response = await api.post('/whatsapp/status-post/video', {
                                                                videoUrl,
                                                                caption: captionEl?.value,
                                                            });
                                                            if (response.data.success) {
                                                                toast.success("Status de vídeo publicado!");
                                                                mediaEl.value = '';
                                                                captionEl.value = '';
                                                            } else {
                                                                toast.error(response.data.error || "Erro ao publicar");
                                                            }
                                                        } catch (error: any) {
                                                            toast.error(error.response?.data?.error || "Erro ao publicar status");
                                                        }
                                                    }}
                                                >
                                                    🎬 Vídeo
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                        onClick={() => onTest('x')}
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

            {/* Instagram */}
            <InstagramSettings config={config} setConfig={setConfig} testing={testing} onTest={onTest} />
        </div>
    );
}
