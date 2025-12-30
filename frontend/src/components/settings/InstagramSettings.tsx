import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TestTube2, Upload, BarChart3, Image, Film } from 'lucide-react';
import { ConfigState } from '@/types/settings';
import api from '@/services/api';
import { toast } from 'sonner';

interface InstagramSettingsProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
    testing: string | null;
    onTest: (service: string) => void;
}

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

interface MediaItem {
    id: string;
    media_type: string;
    caption?: string;
    timestamp: string;
    like_count: number;
    comments_count: number;
    permalink: string;
}

export function InstagramSettings({ config, setConfig, testing, onTest }: InstagramSettingsProps) {
    const [instagramStatus, setInstagramStatus] = useState<InstagramStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [showManualToken, setShowManualToken] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [manualIgUserId, setManualIgUserId] = useState('');
    const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);

    // Publishing state
    const [storyUrl, setStoryUrl] = useState('');
    const [storyMediaType, setStoryMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
    const [reelUrl, setReelUrl] = useState('');
    const [reelCaption, setReelCaption] = useState('');
    const [reelShareToFeed, setReelShareToFeed] = useState(true);
    const [publishing, setPublishing] = useState(false);

    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const fetchInstagramStatus = async () => {
        try {
            const response = await api.get('/instagram/status');
            if (response.data.success) {
                setInstagramStatus(response.data);
                if (response.data.authenticated && connecting) {
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                        checkIntervalRef.current = null;
                    }
                    setConnecting(false);
                    toast.success('Instagram conectado com sucesso!');
                }
                return response.data;
            }
        } catch (error) {
            console.error('Error fetching Instagram status:', error);
        }
        return null;
    };

    const fetchRecentMedia = async () => {
        setLoadingMedia(true);
        try {
            const response = await api.get('/instagram/media?limit=6');
            if (response.data.success) {
                setRecentMedia(response.data.media || []);
            }
        } catch (error) {
            console.error('Error fetching media:', error);
        } finally {
            setLoadingMedia(false);
        }
    };

    useEffect(() => {
        fetchInstagramStatus();
    }, []);

    useEffect(() => {
        if (instagramStatus?.authenticated) {
            fetchRecentMedia();
        }
    }, [instagramStatus?.authenticated]);

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
        toast.info('Processo de conexão cancelado.');
    };

    const handleConnect = async () => {
        try {
            setConnecting(true);
            const response = await api.get('/instagram/auth/url');

            if (response.data?.authUrl) {
                const width = 600;
                const height = 700;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;

                window.open(
                    response.data.authUrl,
                    'InstagramAuth',
                    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
                );

                if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);

                checkIntervalRef.current = setInterval(() => fetchInstagramStatus(), 3000);

                timeoutRef.current = setTimeout(() => {
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                        checkIntervalRef.current = null;
                    }
                    setConnecting(false);
                    toast.warning('Tempo limite atingido. Tente novamente.');
                }, 5 * 60 * 1000);
            } else {
                setConnecting(false);
                toast.error('Não foi possível obter URL de autenticação.');
            }
        } catch (error: any) {
            console.error('Error starting Instagram OAuth:', error);
            toast.error(error.response?.data?.error || 'Erro ao iniciar autenticação.');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setLoading(true);
            await api.post('/instagram/auth/disconnect');
            setInstagramStatus(null);
            toast.success('Instagram desconectado.');
            await fetchInstagramStatus();
        } catch (error: any) {
            console.error('Error disconnecting Instagram:', error);
            toast.error('Erro ao desconectar.');
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        try {
            onTest('instagram');
            const response = await api.post('/instagram/test');
            if (response.data.success) {
                toast.success(response.data.message || 'Conexão verificada!');
            } else {
                toast.error(response.data.error || 'Falha na verificação.');
            }
        } catch (error: any) {
            console.error('Error testing Instagram:', error);
            toast.error(error.response?.data?.error || 'Erro ao testar.');
        }
    };

    const handleConfigSave = async () => {
        try {
            setLoading(true);
            await api.post('/instagram/config', {
                appId: config.instagram?.appId,
                appSecret: config.instagram?.appSecret,
                webhookVerifyToken: config.instagram?.webhookVerifyToken,
            });
            toast.success('Configuração salva.');
            await fetchInstagramStatus();
        } catch (error: any) {
            console.error('Error saving Instagram config:', error);
            toast.error('Erro ao salvar configuração.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualTokenSave = async () => {
        if (!manualToken || !manualIgUserId) {
            toast.error('Preencha o Access Token e o IG User ID.');
            return;
        }

        try {
            setLoading(true);
            await api.post('/instagram/config', {
                accessToken: manualToken,
                igUserId: manualIgUserId,
            });
            toast.success('Token salvo com sucesso!');
            setManualToken('');
            setManualIgUserId('');
            setShowManualToken(false);
            await fetchInstagramStatus();
        } catch (error: any) {
            console.error('Error saving manual token:', error);
            toast.error(error.response?.data?.error || 'Erro ao salvar token.');
        } finally {
            setLoading(false);
        }
    };

    const handlePublishStory = async () => {
        if (!storyUrl) {
            toast.error('Informe a URL da mídia.');
            return;
        }

        try {
            setPublishing(true);
            const response = await api.post('/instagram/story', {
                mediaUrl: storyUrl,
                mediaType: storyMediaType,
            });

            if (response.data.success) {
                toast.success('Story publicado com sucesso!');
                setStoryUrl('');
                fetchRecentMedia();
            } else {
                toast.error(response.data.error || 'Erro ao publicar Story.');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao publicar Story.');
        } finally {
            setPublishing(false);
        }
    };

    const handlePublishReel = async () => {
        if (!reelUrl) {
            toast.error('Informe a URL do vídeo.');
            return;
        }

        try {
            setPublishing(true);
            const response = await api.post('/instagram/reel', {
                videoUrl: reelUrl,
                caption: reelCaption,
                shareToFeed: reelShareToFeed,
            });

            if (response.data.success) {
                toast.success('Reel publicado com sucesso!');
                setReelUrl('');
                setReelCaption('');
                fetchRecentMedia();
            } else {
                toast.error(response.data.error || 'Erro ao publicar Reel.');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao publicar Reel.');
        } finally {
            setPublishing(false);
        }
    };

    const handleSettingsSave = async () => {
        try {
            setLoading(true);
            await api.post('/instagram/settings', {
                enabled: config.instagram?.enabled,
                autoReplyDM: config.instagram?.autoReplyDM,
                welcomeMessage: config.instagram?.welcomeMessage,
            });
            toast.success('Configurações salvas com sucesso!');
        } catch (error) {
            toast.error('Erro ao salvar configurações');
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
                    <CardDescription>Configure Stories, Reels e automação de DMs</CardDescription>
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
            <CardContent>
                <Tabs defaultValue="connection" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="connection">Conexão</TabsTrigger>
                        <TabsTrigger value="messages">Mensagens</TabsTrigger>
                        <TabsTrigger value="publish">Publicar</TabsTrigger>
                        <TabsTrigger value="metrics">Métricas</TabsTrigger>
                    </TabsList>

                    {/* Connection Tab */}
                    <TabsContent value="connection" className="space-y-4 mt-4">
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

                        {/* Manual Token Option */}
                        <div className="mt-4 p-3 border border-dashed rounded-lg">
                            <button
                                type="button"
                                onClick={() => setShowManualToken(!showManualToken)}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                            >
                                <span className={`transform transition-transform ${showManualToken ? 'rotate-90' : ''}`}>▶</span>
                                <span>Usar Token Manual</span>
                            </button>

                            {showManualToken && (
                                <div className="mt-3 space-y-3">
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

                        {/* Status */}
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
                                                    className="border-orange-500 text-orange-500"
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
                            </div>
                        </div>
                    </TabsContent>

                    {/* Messages Tab */}
                    <TabsContent value="messages" className="space-y-4 mt-4">
                        {!instagramStatus?.authenticated ? (
                            <div className="text-center text-muted-foreground py-8">
                                Conecte sua conta do Instagram primeiro.
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base">Habilitar Instagram</Label>
                                        <p className="text-sm text-muted-foreground">Ativar/desativar canal Instagram</p>
                                    </div>
                                    <Switch
                                        checked={config.instagram?.enabled !== false}
                                        onCheckedChange={(checked) => {
                                            setConfig({
                                                ...config,
                                                instagram: { ...config.instagram!, enabled: checked }
                                            });
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base">Auto-responder DMs</Label>
                                        <p className="text-sm text-muted-foreground">Responder automaticamente mensagens diretas</p>
                                    </div>
                                    <Switch
                                        checked={config.instagram?.autoReplyDM !== false}
                                        onCheckedChange={(checked) => {
                                            setConfig({
                                                ...config,
                                                instagram: { ...config.instagram!, autoReplyDM: checked }
                                            });
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
                                    <textarea
                                        id="welcomeMessage"
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={config.instagram?.welcomeMessage || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            instagram: { ...config.instagram!, welcomeMessage: e.target.value }
                                        })}
                                        placeholder="Digite a mensagem de boas-vindas..."
                                    />
                                </div>

                                <Button onClick={handleSettingsSave} disabled={loading} className="w-full">
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Salvar Configurações
                                </Button>
                            </>
                        )}
                    </TabsContent>

                    {/* Publish Tab */}
                    <TabsContent value="publish" className="space-y-4 mt-4">
                        {!instagramStatus?.authenticated ? (
                            <div className="text-center text-muted-foreground py-8">
                                Conecte sua conta do Instagram primeiro.
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Story */}
                                <div className="p-4 border rounded-lg space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Image className="w-4 h-4" />
                                        Publicar Story
                                    </h4>
                                    <div className="space-y-2">
                                        <Label>URL da Mídia (pública)</Label>
                                        <Input
                                            value={storyUrl}
                                            onChange={(e) => setStoryUrl(e.target.value)}
                                            placeholder="https://exemplo.com/imagem.jpg"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={storyMediaType === 'IMAGE' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setStoryMediaType('IMAGE')}
                                        >
                                            Imagem
                                        </Button>
                                        <Button
                                            variant={storyMediaType === 'VIDEO' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setStoryMediaType('VIDEO')}
                                        >
                                            Vídeo
                                        </Button>
                                    </div>
                                    <Button
                                        onClick={handlePublishStory}
                                        disabled={publishing || !storyUrl}
                                        className="w-full"
                                    >
                                        {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        Publicar Story
                                    </Button>
                                </div>

                                {/* Reel */}
                                <div className="p-4 border rounded-lg space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Film className="w-4 h-4" />
                                        Publicar Reel
                                    </h4>
                                    <div className="space-y-2">
                                        <Label>URL do Vídeo (MP4)</Label>
                                        <Input
                                            value={reelUrl}
                                            onChange={(e) => setReelUrl(e.target.value)}
                                            placeholder="https://exemplo.com/video.mp4"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Legenda (opcional)</Label>
                                        <Input
                                            value={reelCaption}
                                            onChange={(e) => setReelCaption(e.target.value)}
                                            placeholder="Descrição do reel..."
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={reelShareToFeed}
                                            onCheckedChange={setReelShareToFeed}
                                        />
                                        <Label className="text-sm">Compartilhar no Feed</Label>
                                    </div>
                                    <Button
                                        onClick={handlePublishReel}
                                        disabled={publishing || !reelUrl}
                                        className="w-full"
                                    >
                                        {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        Publicar Reel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Metrics Tab */}
                    <TabsContent value="metrics" className="space-y-4 mt-4">
                        {!instagramStatus?.authenticated ? (
                            <div className="text-center text-muted-foreground py-8">
                                Conecte sua conta do Instagram primeiro.
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Publicações Recentes
                                    </h4>
                                    <Button variant="ghost" size="sm" onClick={fetchRecentMedia} disabled={loadingMedia}>
                                        {loadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
                                    </Button>
                                </div>

                                {recentMedia.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        Nenhuma publicação encontrada.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {recentMedia.map((item) => (
                                            <a
                                                key={item.id}
                                                href={item.permalink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                                            >
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    {item.media_type}
                                                </div>
                                                <div className="text-sm line-clamp-2 mb-2">
                                                    {item.caption || '(sem legenda)'}
                                                </div>
                                                <div className="flex gap-3 text-xs text-muted-foreground">
                                                    <span>❤️ {item.like_count}</span>
                                                    <span>💬 {item.comments_count}</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
