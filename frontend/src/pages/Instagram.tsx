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
    Zap
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

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
}

export default function InstagramPage() {
    const [status, setStatus] = useState<InstagramStatus | null>(null);
    const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
    const [settings, setSettings] = useState<InstagramSettings>({
        enabled: true,
        autoReplyDM: false,
        welcomeMessage: ''
    });
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [publishing, setPublishing] = useState<'story' | 'reel' | null>(null);
    const [storyUrl, setStoryUrl] = useState('');
    const [reelUrl, setReelUrl] = useState('');
    const [reelCaption, setReelCaption] = useState('');
    // Admin config state
    const [appId, setAppId] = useState('');
    const [appSecret, setAppSecret] = useState('');
    const [savingConfig, setSavingConfig] = useState(false);

    useEffect(() => {
        fetchStatus();
        fetchRecentMedia();
        fetchSettings();
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
            const response = await api.get('/instagram/media/recent');
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
                setSettings(response.data.settings);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
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
        if (!appId.trim() || !appSecret.trim()) {
            toast.error('Preencha App ID e App Secret');
            return;
        }
        setSavingConfig(true);
        try {
            await api.post('/instagram/config', { appId, appSecret });
            toast.success('Configuração salva! Atualizando status...');
            setAppId('');
            setAppSecret('');
            await fetchStatus();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar configuração');
        } finally {
            setSavingConfig(false);
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
            const response = await api.post('/instagram/publish/story', {
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
            const response = await api.post('/instagram/publish/reel', {
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
            <div className="space-y-6">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Connection Status Card */}
                    <Card className="lg:col-span-1">
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
                                        <div>
                                            <p className="font-semibold text-lg">@{status.account.username}</p>
                                            {status.account.name && (
                                                <p className="text-sm text-muted-foreground">{status.account.name}</p>
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
                            ) : !status?.configured ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                        <div className="flex items-start gap-3">
                                            <Settings2 className="h-5 w-5 text-yellow-500 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="font-medium text-yellow-500">Configuração Meta</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Obtenha as credenciais no{' '}
                                                    <a
                                                        href="https://developers.facebook.com/apps"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                    >
                                                        Meta for Developers
                                                    </a>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="app-id">App ID</Label>
                                            <Input
                                                id="app-id"
                                                placeholder="707099469134657"
                                                value={appId}
                                                onChange={(e) => setAppId(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="app-secret">App Secret</Label>
                                            <Input
                                                id="app-secret"
                                                type="password"
                                                placeholder="650d9b4d3dedfd47fe585..."
                                                value={appSecret}
                                                onChange={(e) => setAppSecret(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleSaveConfig}
                                        disabled={savingConfig || !appId.trim() || !appSecret.trim()}
                                    >
                                        {savingConfig ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                        )}
                                        Salvar Configuração
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                                        <XCircle className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Não conectado</p>
                                        <p className="text-sm text-muted-foreground">
                                            Conecte sua conta Instagram Business
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
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Publishing Tools */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Publicar
                            </CardTitle>
                            <CardDescription>Publique Stories e Reels</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Story */}
                                <div className="space-y-4 p-4 rounded-lg border bg-card">
                                    <div className="flex items-center gap-2">
                                        <Image className="h-5 w-5 text-pink-500" />
                                        <h3 className="font-semibold">Story</h3>
                                    </div>
                                    <div className="space-y-2">
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
                                        className="w-full"
                                        onClick={handlePublishStory}
                                        disabled={!status?.authenticated || publishing === 'story'}
                                    >
                                        {publishing === 'story' ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Image className="h-4 w-4 mr-2" />
                                        )}
                                        Publicar Story
                                    </Button>
                                </div>

                                {/* Reel */}
                                <div className="space-y-4 p-4 rounded-lg border bg-card">
                                    <div className="flex items-center gap-2">
                                        <Film className="h-5 w-5 text-purple-500" />
                                        <h3 className="font-semibold">Reel</h3>
                                    </div>
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
                                            rows={2}
                                        />
                                    </div>
                                    <Button
                                        className="w-full"
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
                        </CardContent>
                    </Card>
                </div>

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
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

                {/* DM Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            Configurações de DM
                        </CardTitle>
                        <CardDescription>Configure respostas automáticas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Resposta Automática</Label>
                                <p className="text-sm text-muted-foreground">
                                    Responder automaticamente a novas mensagens
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
                            <Label htmlFor="welcome-message">Mensagem de Boas-vindas</Label>
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
                            onClick={handleSaveSettings}
                            disabled={!status?.authenticated}
                        >
                            Salvar Configurações
                        </Button>
                    </CardContent>
                </Card>

                {/* Auto-posting Feature - Coming Soon */}
                <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Postagem Automática de Ofertas
                            <Badge variant="secondary" className="ml-2">Em breve</Badge>
                        </CardTitle>
                        <CardDescription>
                            Publique ofertas automaticamente no feed do Instagram
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p>🚀 <strong>Funcionalidade em desenvolvimento!</strong></p>
                            <p>Em breve você poderá:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Configurar postagem automática de ofertas</li>
                                <li>Escolher entre Feed, Story ou ambos</li>
                                <li>Personalizar legendas com IA</li>
                                <li>Definir filtros por desconto mínimo</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
