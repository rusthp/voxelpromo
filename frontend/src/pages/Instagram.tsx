import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Instagram,
    RefreshCw,
    Image,
    Film,
    MessageCircle,
    Settings2,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Loader2,
    Upload,
    Heart,
    MessageSquare,
    Zap,
    TrendingUp,
    MousePointerClick,
    Plus,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HelpTip } from '@/components/ui/help-tip';

interface InstagramAccount {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
}

interface InstagramStatus {
    configured: boolean;
    authenticated: boolean;
    account?: InstagramAccount;
}

interface MediaItem {
    id: string;
    media_type: string;
    caption?: string;
    timestamp: string;
    like_count: number;
    comments_count: number;
    permalink: string;
    thumbnail_url?: string;
    media_url?: string;
}

interface InstagramSettings {
    enabled: boolean;
    autoReplyDM: boolean;
    welcomeMessage: string;
    keywordReplies: Record<string, string>;
    conversionKeywords: string[];
}

interface InstagramStats {
    total: number;
    today: number;
    bySource: Record<string, number>;
    recent: {
        id: string;
        offerTitle: string;
        offerImage?: string;
        recipient: string;
        source: string;
        date: string;
        status: string;
    }[];
}

export default function InstagramPage() {
    const [status, setStatus] = useState<InstagramStatus | null>(null);
    const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
    const [settings, setSettings] = useState<InstagramSettings>({
        enabled: true,
        autoReplyDM: false,
        welcomeMessage: '',
        keywordReplies: {},
        conversionKeywords: []
    });
    const [stats, setStats] = useState<InstagramStats | null>(null);
    const [newKeyword, setNewKeyword] = useState('');
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [publishing, setPublishing] = useState<'story' | 'reel' | null>(null);
    const [storyUrl, setStoryUrl] = useState('');
    const [reelUrl, setReelUrl] = useState('');
    const [reelCaption, setReelCaption] = useState('');
    // Admin config state
    const [appId, setAppId] = useState('');
    const [appSecret, setAppSecret] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [savingConfig, setSavingConfig] = useState(false);
    const [isEditingConfig, setIsEditingConfig] = useState(false);

    useEffect(() => {
        fetchStatus();
        fetchRecentMedia();
        fetchSettings();
        fetchStats();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/instagram/status');
            setStatus(response.data);
        } catch (error) {
            console.error('Error fetching Instagram status:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentMedia = async () => {
        try {
            const response = await api.get('/instagram/media');
            if (response.data.success) {
                setRecentMedia(response.data.media || []);
            }
        } catch (error) {
            console.error('Error fetching recent media:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get('/instagram/settings');
            if (response.data.success) {
                setSettings({
                    ...response.data.settings,
                    keywordReplies: response.data.settings.keywordReplies || {},
                    conversionKeywords: response.data.settings.conversionKeywords || []
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/instagram/conversions');
            if (response.data.success) {
                setStats(response.data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleAddKeyword = () => {
        if (!newKeyword.trim()) return;
        if (settings.conversionKeywords.includes(newKeyword.trim())) {
            toast.error('Palavra-chave já existe');
            return;
        }

        const updatedKeywords = [...(settings.conversionKeywords || []), newKeyword.trim()];
        setSettings(s => ({ ...s, conversionKeywords: updatedKeywords }));
        setNewKeyword('');
    };

    const handleRemoveKeyword = (keyword: string) => {
        const updatedKeywords = settings.conversionKeywords.filter(k => k !== keyword);
        setSettings(s => ({ ...s, conversionKeywords: updatedKeywords }));
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const response = await api.get('/instagram/auth/url');
            if (response.data.success && response.data.authUrl) {
                window.location.href = response.data.authUrl;
            } else {
                toast.error('Erro ao gerar URL de autenticação');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao conectar');
        } finally {
            setConnecting(false);
        }
    };

    const handleSaveConfig = async () => {
        if ((!appId.trim() || !appSecret.trim()) && !accessToken.trim()) {
            toast.error('Preencha App ID e Secret OU Access Token');
            return;
        }
        setSavingConfig(true);
        try {
            await api.post('/instagram/config', { appId, appSecret, accessToken });
            toast.success('Configuração salva! Atualizando status...');
            setAppId('');
            setAppSecret('');
            setAccessToken('');
            await fetchStatus();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar configuração');
        } finally {
            setSavingConfig(false);
            setIsEditingConfig(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await api.post('/instagram/auth/disconnect');
            setStatus({ configured: status?.configured || false, authenticated: false });
            toast.success('Instagram desconectado');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao desconectar');
        }
    };

    const handlePublishStory = async () => {
        if (!storyUrl.trim()) {
            toast.error('Informe a URL da imagem');
            return;
        }
        setPublishing('story');
        try {
            const response = await api.post('/instagram/story', {
                mediaUrl: storyUrl,
                mediaType: 'IMAGE'
            });
            if (response.data.success) {
                toast.success('Story publicado com sucesso!');
                setStoryUrl('');
                fetchRecentMedia();
            } else {
                toast.error(response.data.error || 'Erro ao publicar Story');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao publicar Story');
        } finally {
            setPublishing(null);
        }
    };

    const handlePublishReel = async () => {
        if (!reelUrl.trim()) {
            toast.error('Informe a URL do vídeo');
            return;
        }
        setPublishing('reel');
        try {
            const response = await api.post('/instagram/reel', {
                videoUrl: reelUrl,
                caption: reelCaption
            });
            if (response.data.success) {
                toast.success('Reel publicado com sucesso!');
                setReelUrl('');
                setReelCaption('');
                fetchRecentMedia();
            } else {
                toast.error(response.data.error || 'Erro ao publicar Reel');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao publicar Reel');
        } finally {
            setPublishing(null);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await api.post('/instagram/settings', settings);
            toast.success('Configurações salvas!');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto max-w-7xl p-6 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Instagram className="h-8 w-8 text-pink-500" />
                            Instagram
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Gerencie sua conta e publique conteúdo
                        </p>
                    </div>
                    <Button variant="outline" onClick={fetchStatus}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                </div>

                {/* Beta Warning Banner */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-amber-600 dark:text-amber-400">
                            🧪 Funcionalidade em Fase de Testes
                        </p>
                        <p className="text-sm text-muted-foreground">
                            A integração com Instagram está em desenvolvimento ativo. Algumas funcionalidades podem apresentar instabilidade.
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                        <TabsTrigger value="automation" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Automação & Conversão
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left Sidebar (Account Only) */}
                            <div className="lg:col-span-4 space-y-6">
                                {/* Connection Status Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Settings2 className="h-5 w-5" />
                                            Conta
                                        </CardTitle>
                                        <CardDescription>Status da conexão</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {status?.authenticated && status.account ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    {status.account.profile_picture_url ? (
                                                        <img
                                                            src={status.account.profile_picture_url}
                                                            alt={status.account.username}
                                                            className="w-16 h-16 rounded-full border-2 border-pink-500"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                                            <Instagram className="h-8 w-8 text-white" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-lg truncate">@{status.account.username}</p>
                                                        {status.account.name && (
                                                            <p className="text-sm text-muted-foreground truncate">{status.account.name}</p>
                                                        )}
                                                        <Badge variant="default" className="mt-1 bg-green-500">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Conectado
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    className="w-full"
                                                    onClick={handleDisconnect}
                                                >
                                                    Desconectar
                                                </Button>
                                            </div>
                                        ) : !status?.configured || isEditingConfig ? (
                                            <div className="space-y-4">
                                                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                                    <div className="flex items-start gap-3">
                                                        <Settings2 className="h-5 w-5 text-yellow-500 mt-0.5" />
                                                        <div className="space-y-1">
                                                            <p className="font-medium text-yellow-500">Business Login for Instagram</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Obtenha as credenciais em:{' '}
                                                                <a
                                                                    href="https://developers.facebook.com/apps"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary hover:underline"
                                                                >
                                                                    App Dashboard
                                                                </a>{' '}
                                                                → Instagram → API setup with Instagram login → Business login settings
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                ⚠️ Use o <strong>Instagram App ID</strong> (não o Facebook App ID!)
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="app-id">Instagram App ID</Label>
                                                        <Input
                                                            id="app-id"
                                                            placeholder="Ex: 990602627938098"
                                                            value={appId}
                                                            onChange={(e) => setAppId(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="app-secret">Instagram App Secret</Label>
                                                        <Input
                                                            id="app-secret"
                                                            type="password"
                                                            placeholder="Ex: a1b2c3d4e5f6g7h8..."
                                                            value={appSecret}
                                                            onChange={(e) => setAppSecret(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute inset-0 flex items-center">
                                                            <span className="w-full border-t border-muted-foreground/20" />
                                                        </div>
                                                        <div className="relative flex justify-center text-xs uppercase">
                                                            <span className="bg-background px-2 text-muted-foreground">Ou</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="access-token">Manual Access Token (Opcional)</Label>
                                                            <HelpTip
                                                                id="manual-token-info"
                                                                title="Token de Usuário"
                                                                description="Opção para usuários avançados que geram tokens via Graph API Explorer."
                                                            />
                                                        </div>
                                                        <Input
                                                            id="access-token"
                                                            type="password"
                                                            placeholder="EAALx..."
                                                            value={accessToken}
                                                            onChange={(e) => setAccessToken(e.target.value)}
                                                        />

                                                        {/* Instructions Accordion */}
                                                        <details className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border text-xs">
                                                            <summary className="cursor-pointer font-medium hover:text-primary transition-colors select-none">
                                                                Como obter um token manual?
                                                            </summary>
                                                            <div className="mt-3 space-y-2 pl-2 border-l-2 border-primary/20">
                                                                <p>1. Acesse o <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Graph API Explorer</a>.</p>
                                                                <p>2. Selecione seu <strong>Aplicativo</strong>.</p>
                                                                <p>3. Em <strong>User or Page</strong>, selecione "Get User Access Token".</p>
                                                                <p>4. Adicione as permissões:</p>
                                                                <ul className="list-disc pl-4 font-mono text-[10px] text-muted-foreground/80">
                                                                    <li>pages_show_list</li>
                                                                    <li>instagram_basic</li>
                                                                    <li>instagram_content_publish</li>
                                                                    <li>pages_read_engagement</li>
                                                                    <li>instagram_manage_messages (opcional)</li>
                                                                </ul>
                                                                <p>5. Clique em <strong>Generate Access Token</strong>.</p>
                                                                <p>6. (Recomendado) Abra no "Access Token Tool" e estenda para longa duração.</p>
                                                            </div>
                                                        </details>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {status?.configured && (
                                                        <Button
                                                            variant="outline"
                                                            className="w-full"
                                                            onClick={() => setIsEditingConfig(false)}
                                                            disabled={savingConfig}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    )}
                                                    <Button
                                                        className="w-full"
                                                        onClick={handleSaveConfig}
                                                        disabled={savingConfig || ((!appId.trim() || !appSecret.trim()) && !accessToken.trim())}
                                                    >
                                                        {savingConfig ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                                        )}
                                                        Salvar Configuração
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 text-center">
                                                <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                                                    <XCircle className="h-10 w-10 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Não conectado</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Login direto com credenciais Instagram
                                                    </p>
                                                </div>
                                                <Button
                                                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                                                    onClick={handleConnect}
                                                    disabled={connecting}
                                                >
                                                    {connecting ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Instagram className="h-4 w-4 mr-2" />
                                                    )}
                                                    Conectar Instagram
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full text-muted-foreground hover:text-foreground"
                                                    onClick={() => setIsEditingConfig(true)}
                                                >
                                                    <Settings2 className="h-3 w-3 mr-2" />
                                                    Alterar App ID / Secret
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Main Content (Publish & Posts) */}
                            <div className="lg:col-span-8 space-y-6">
                                {/* Publishing Tools */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Upload className="h-5 w-5" />
                                            Publicar Conteúdo
                                        </CardTitle>
                                        <CardDescription>Crie novas publicações para seu Feed e Stories</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 gap-6">
                                            {/* Story */}
                                            <div className="p-4 rounded-lg border bg-card/50">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-2 rounded-full bg-pink-500/10 text-pink-500">
                                                        <Image className="h-5 w-5" />
                                                    </div>
                                                    <h3 className="font-semibold text-lg">Publicar Story</h3>
                                                </div>
                                                <div className="flex gap-4 items-end">
                                                    <div className="space-y-2 flex-1">
                                                        <Label htmlFor="story-url">URL da Imagem</Label>
                                                        <Input
                                                            id="story-url"
                                                            placeholder="https://exemplo.com/imagem.jpg"
                                                            value={storyUrl}
                                                            onChange={(e) => setStoryUrl(e.target.value)}
                                                            disabled={!status?.authenticated}
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={handlePublishStory}
                                                        disabled={!status?.authenticated || publishing === 'story'}
                                                    >
                                                        {publishing === 'story' ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Image className="h-4 w-4 mr-2" />
                                                        )}
                                                        Publicar
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Reel */}
                                            <div className="p-4 rounded-lg border bg-card/50">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-2 rounded-full bg-purple-500/10 text-purple-500">
                                                        <Film className="h-5 w-5" />
                                                    </div>
                                                    <h3 className="font-semibold text-lg">Publicar Reel</h3>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="reel-url">URL do Vídeo</Label>
                                                        <Input
                                                            id="reel-url"
                                                            placeholder="https://exemplo.com/video.mp4"
                                                            value={reelUrl}
                                                            onChange={(e) => setReelUrl(e.target.value)}
                                                            disabled={!status?.authenticated}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="reel-caption">Legenda (opcional)</Label>
                                                        <Textarea
                                                            id="reel-caption"
                                                            placeholder="Digite a legenda do Reel..."
                                                            value={reelCaption}
                                                            onChange={(e) => setReelCaption(e.target.value)}
                                                            disabled={!status?.authenticated}
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <Button
                                                            className="min-w-[150px]"
                                                            onClick={handlePublishReel}
                                                            disabled={!status?.authenticated || publishing === 'reel'}
                                                        >
                                                            {publishing === 'reel' ? (
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            ) : (
                                                                <Film className="h-4 w-4 mr-2" />
                                                            )}
                                                            Publicar Reel
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Recent Posts Grid */}
                                {status?.authenticated && recentMedia.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Image className="h-5 w-5" />
                                                Posts Recentes
                                            </CardTitle>
                                            <CardDescription>Suas últimas publicações</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {recentMedia.slice(0, 8).map((item) => (
                                                    <a
                                                        key={item.id}
                                                        href={item.permalink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-pink-500 transition-all"
                                                    >
                                                        <img
                                                            src={item.thumbnail_url || item.media_url}
                                                            alt={item.caption || 'Post'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                                                            <div className="flex items-center gap-1">
                                                                <Heart className="h-5 w-5" />
                                                                <span className="text-sm font-medium">{item.like_count}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <MessageSquare className="h-5 w-5" />
                                                                <span className="text-sm font-medium">{item.comments_count}</span>
                                                            </div>
                                                        </div>
                                                        {item.media_type === 'VIDEO' && (
                                                            <div className="absolute top-2 right-2">
                                                                <Film className="h-5 w-5 text-white drop-shadow-lg" />
                                                            </div>
                                                        )}
                                                    </a>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="automation" className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <MousePointerClick className="h-4 w-4 text-pink-500" />
                                        Total de Conversões
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.total || 0}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-yellow-500" />
                                        Hoje
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.today || 0}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Conversões hoje</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                        Origem (Stories)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.bySource?.story_reply || 0}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Respostas a Stories</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4 space-y-6">
                                {/* Keyword Config */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MessageSquare className="h-5 w-5" />
                                            Palavras-Chave
                                        </CardTitle>
                                        <CardDescription>Gatilhos para automação de vendas</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Adicionar Palavra-chave</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Ex: eu quero"
                                                    value={newKeyword}
                                                    onChange={e => setNewKeyword(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                                                />
                                                <Button size="icon" onClick={handleAddKeyword}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Palavras ativas</Label>
                                            <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg min-h-[100px] content-start">
                                                {settings.conversionKeywords?.map(k => (
                                                    <Badge key={k} variant="secondary" className="flex items-center gap-1 bg-background border shadow-sm">
                                                        {k}
                                                        <Trash2
                                                            className="h-3 w-3 cursor-pointer hover:text-red-500 ml-1"
                                                            onClick={() => handleRemoveKeyword(k)}
                                                        />
                                                    </Badge>
                                                ))}
                                                {(!settings.conversionKeywords || settings.conversionKeywords.length === 0) && (
                                                    <span className="text-sm text-muted-foreground italic w-full text-center py-4">
                                                        Nenhuma palavra configurada
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button className="w-full" onClick={handleSaveSettings}>
                                            Salvar Alterações
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* DM Settings (Moved from Overview) */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MessageCircle className="h-5 w-5" />
                                            Boas-vindas
                                        </CardTitle>
                                        <CardDescription>Respostas automáticas gerais</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Auto-resposta</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Responder novas DMs
                                                </p>
                                            </div>
                                            <Switch
                                                checked={settings.autoReplyDM}
                                                onCheckedChange={(checked) => setSettings(s => ({ ...s, autoReplyDM: checked }))}
                                                disabled={!status?.authenticated}
                                            />
                                        </div>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Label htmlFor="welcome-message">Mensagem padrão</Label>
                                            <Textarea
                                                id="welcome-message"
                                                placeholder="Olá! Obrigado por entrar em contato..."
                                                value={settings.welcomeMessage}
                                                onChange={(e) => setSettings(s => ({ ...s, welcomeMessage: e.target.value }))}
                                                disabled={!status?.authenticated}
                                                rows={3}
                                            />
                                        </div>
                                        <Button
                                            className="w-full"
                                            onClick={handleSaveSettings}
                                            disabled={!status?.authenticated}
                                        >
                                            Salvar Configurações
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-8">
                                {/* Conversion Logs */}
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Histórico de Conversões</CardTitle>
                                        <CardDescription>Links de ofertas enviados automaticamente</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data</TableHead>
                                                    <TableHead>Oferta</TableHead>
                                                    <TableHead>Usuário</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {stats?.recent?.map((log) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="text-sm">
                                                            {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {log.offerImage && (
                                                                    <img src={log.offerImage} alt="" className="w-8 h-8 rounded object-cover" />
                                                                )}
                                                                <span className="truncate max-w-[150px]">{log.offerTitle}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>@{log.recipient}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                                                Enviado
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {(!stats?.recent || stats.recent.length === 0) && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                            Nenhuma conversão registrada recentemente
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}
