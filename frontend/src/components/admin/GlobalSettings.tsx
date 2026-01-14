import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Settings,
    DollarSign,
    Save,
    RefreshCcw,
    Shield,
    Globe,
    Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { cn } from "@/lib/utils";

// Moved outside component to prevent re-creation on re-render
const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <Card className={cn("border-white/10 bg-black/20 backdrop-blur-xl shadow-xl", className)}>
        {children}
    </Card>
);

const StyledInput = (props: React.ComponentProps<typeof Input>) => (
    <Input
        {...props}
        className={cn("bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20", props.className)}
    />
);

export function GlobalSettings() {
    const [config, setConfig] = useState<any>({
        amazon: { associateTag: "", accessKey: "", secretKey: "" },
        x: { apiKey: "", apiKeySecret: "", accessToken: "", accessTokenSecret: "", bearerToken: "" },
        payment: { mpAccessToken: "", mpPublicKey: "", mpWebhookSecret: "" },
        resend: { apiKey: "", from: "" },
        maintenanceMode: false,
        registrationEnabled: true,
        maxOffersPerUser: 1000,
        trialDays: 7,
        globalNotification: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/config');
            setConfig(response.data);
        } catch (error) {
            console.error('Error fetching config:', error);
            toast({
                title: "Erro",
                description: "Falha ao carregar configurações.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (section: string, key: string, value: any) => {
        setConfig((prev: any) => {
            if (section === 'root') {
                return { ...prev, [key]: value };
            }
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [key]: value
                }
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/config', config);
            toast({
                title: "Sucesso",
                description: "Configurações salvas com sucesso!",
            });
        } catch (error) {
            console.error('Error saving config:', error);
            toast({
                title: "Erro",
                description: "Falha ao salvar configurações.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-white/50 animate-pulse">Carregando configurações...</div>;
    }


    return (
        <div className="space-y-6 max-w-5xl mx-auto">

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Configurações</h2>
                    <p className="text-white/50">Gerencie as configurações globais da plataforma</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/20 border-0">
                    {saving ? (
                        <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Alterações
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* System Configuration */}
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Settings className="h-5 w-5 text-purple-400" />
                                Sistema & Acesso
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Controle comportamentos globais e notificações
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="space-y-1">
                                    <Label className="text-base text-white font-medium">Modo de Manutenção</Label>
                                    <p className="text-xs text-white/50">
                                        Bloqueia o acesso de usuários regulares ao sistema
                                    </p>
                                </div>
                                <Switch
                                    checked={config.maintenanceMode || false}
                                    onCheckedChange={(v) => handleConfigChange("root", "maintenanceMode", v)}
                                    className="data-[state=checked]:bg-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white/80">Notificação Global (Banner)</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                    <StyledInput
                                        placeholder="Ex: Sistema será atualizado às 22h..."
                                        value={config.globalNotification || ""}
                                        onChange={(e) => handleConfigChange("root", "globalNotification", e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </GlassCard>

                    {/* Amazon Associates */}
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <DollarSign className="h-5 w-5 text-amber-400" />
                                Amazon Associates
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Configuração de monetização e rastreamento
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-white/80">Amazon Associate Tag</Label>
                                <StyledInput
                                    placeholder="ex: voxelpromo-20"
                                    value={config.amazon?.associateTag || ""}
                                    onChange={(e) => handleConfigChange("amazon", "associateTag", e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white/80">Access Key ID</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                        <StyledInput
                                            type="password"
                                            value={config.amazon?.accessKey || ""}
                                            onChange={(e) => handleConfigChange("amazon", "accessKey", e.target.value)}
                                            className="pl-9 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/80">Secret Access Key</Label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                        <StyledInput
                                            type="password"
                                            value={config.amazon?.secretKey || ""}
                                            onChange={(e) => handleConfigChange("amazon", "secretKey", e.target.value)}
                                            className="pl-9 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </GlassCard>

                    {/* Mercado Pago Payment */}
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <DollarSign className="h-5 w-5 text-green-400" />
                                Mercado Pago (Pagamentos)
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Configuração de pagamentos compartilhada (todos os usuários)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Warning Notice */}
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                <p className="text-xs text-amber-400">
                                    ⚠️ <strong>Configuração via .env</strong>: As credenciais de pagamento são gerenciadas no arquivo .env do servidor por segurança.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/80">Access Token</Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                    <StyledInput
                                        type="password"
                                        placeholder="APP_USR-..."
                                        value={config.payment?.mpAccessToken || ""}
                                        onChange={(e) => handleConfigChange("payment", "mpAccessToken", e.target.value)}
                                        className="pl-9 font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white/80">Public Key</Label>
                                    <StyledInput
                                        type="password"
                                        placeholder="APP_USR-..."
                                        value={config.payment?.mpPublicKey || ""}
                                        onChange={(e) => handleConfigChange("payment", "mpPublicKey", e.target.value)}
                                        className="font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/80">Webhook Secret</Label>
                                    <StyledInput
                                        type="password"
                                        placeholder="Chave secreta..."
                                        value={config.payment?.mpWebhookSecret || ""}
                                        onChange={(e) => handleConfigChange("payment", "mpWebhookSecret", e.target.value)}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </GlassCard>

                    {/* Email - Resend API */}
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Globe className="h-5 w-5 text-blue-400" />
                                Email (Resend)
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Configuração de email para todos os usuários
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Warning Notice */}
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                <p className="text-xs text-amber-400">
                                    ⚠️ <strong>Configuração via .env</strong>: As credenciais de email são gerenciadas no arquivo .env do servidor por segurança.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/80">Resend API Key</Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                    <StyledInput
                                        type="password"
                                        placeholder="re_..."
                                        value={config.resend?.apiKey || ""}
                                        onChange={(e) => handleConfigChange("resend", "apiKey", e.target.value)}
                                        className="pl-9 font-mono text-xs"
                                    />
                                </div>
                                <p className="text-xs text-white/40">
                                    Obtenha em: <a href="https://resend.com/api-keys" target="_blank" className="text-blue-400 hover:underline">resend.com/api-keys</a>
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/80">Remetente (From)</Label>
                                <StyledInput
                                    placeholder="VoxelPromo <noreply@voxelpromo.com>"
                                    value={config.resend?.from || ""}
                                    onChange={(e) => handleConfigChange("resend", "from", e.target.value)}
                                />
                                <p className="text-xs text-white/40">
                                    Domínio deve estar verificado no Resend
                                </p>
                            </div>
                        </CardContent>
                    </GlassCard>
                </div>

                {/* Side Column (X Automation) */}
                <div className="space-y-6">
                    <GlassCard className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <svg className="h-5 w-5 text-white fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zl-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                X (Twitter) API
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Credenciais de Automação
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-white/80 text-xs">Bearer Token</Label>
                                <StyledInput
                                    type="password"
                                    value={config.x?.bearerToken || ""}
                                    onChange={(e) => handleConfigChange("x", "bearerToken", e.target.value)}
                                    className="font-mono text-[10px]"
                                />
                            </div>

                            <Separator className="bg-white/10" />

                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">OAuth 1.0a</h4>
                                <div className="space-y-2">
                                    <Label className="text-white/80 text-xs">API Key</Label>
                                    <StyledInput
                                        type="password"
                                        value={config.x?.apiKey || ""}
                                        onChange={(e) => handleConfigChange("x", "apiKey", e.target.value)}
                                        className="font-mono text-[10px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/80 text-xs">API Secret</Label>
                                    <StyledInput
                                        type="password"
                                        value={config.x?.apiKeySecret || ""}
                                        onChange={(e) => handleConfigChange("x", "apiKeySecret", e.target.value)}
                                        className="font-mono text-[10px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/80 text-xs">Access Token</Label>
                                    <StyledInput
                                        type="password"
                                        value={config.x?.accessToken || ""}
                                        onChange={(e) => handleConfigChange("x", "accessToken", e.target.value)}
                                        className="font-mono text-[10px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/80 text-xs">Access Token Secret</Label>
                                    <StyledInput
                                        type="password"
                                        value={config.x?.accessTokenSecret || ""}
                                        onChange={(e) => handleConfigChange("x", "accessTokenSecret", e.target.value)}
                                        className="font-mono text-[10px]"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
