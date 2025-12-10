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

export function MessagingSettings({ config, setConfig, testing, onTest }: MessagingSettingsProps) {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<string>("");
    const [isReady, setIsReady] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

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

    return (
        <div className="space-y-6">
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
                                            {(config.whatsapp.targetGroups?.length || 0) + (config.whatsapp.targetNumber && !config.whatsapp.targetGroups?.includes(config.whatsapp.targetNumber) ? 1 : 0) > 0 ?
                                                `${(config.whatsapp.targetGroups?.length || 0)} grupos selecionados` :
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
        </div>
    );
}
