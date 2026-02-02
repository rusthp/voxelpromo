import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, TestTube2, Rss, ExternalLink, RefreshCw, CheckCircle2, XCircle, AlertCircle, Plus, Trash2 } from "lucide-react";
import { FaAmazon } from "react-icons/fa6";
import { SiAliexpress, SiMercadopago } from "react-icons/si";
import { ConfigState, MlAuthStatus } from "@/types/settings";
import { AMAZON_REGIONS, AMAZON_REGION_LABELS } from "@/constants/channels";

interface AffiliateSettingsProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
    testing: string | null;
    onTest: (service: string) => void;
    // Mercado Livre OAuth
    mlAuthStatus: MlAuthStatus;
    mlOAuthLoading: boolean;
    mlOAuthCode: string;
    setMlOAuthCode: (value: string) => void;
    mlCustomUrl: string;
    setMlCustomUrl: (value: string) => void;
    mlScraping: boolean;
    onStartMlOAuth: () => void;
    onRefreshMlToken: () => void;
    onTestMlConnection: () => void;
    onExchangeMlOAuthCode: () => void;
    onScrapeCustomUrl: () => void;
    formatExpiresIn: (seconds: number) => string;
    // Amazon scraping
    amazonCustomUrl: string;
    setAmazonCustomUrl: (value: string) => void;
    amazonScraping: boolean;
    onScrapeAmazonUrl: () => void;
    // Shopee feeds
    newShopeeFeed: string;
    setNewShopeeFeed: (value: string) => void;
    onAddShopeeFeed: () => void;
    onRemoveShopeeFeed: (index: number) => void;
}

export function AffiliateSettings({
    config,
    setConfig,
    testing,
    onTest,
    mlAuthStatus,
    mlOAuthLoading,
    mlOAuthCode,
    setMlOAuthCode,
    mlCustomUrl,
    setMlCustomUrl,
    mlScraping,
    onStartMlOAuth,
    onRefreshMlToken,
    onTestMlConnection,
    onExchangeMlOAuthCode,
    onScrapeCustomUrl,
    formatExpiresIn,
    amazonCustomUrl,
    setAmazonCustomUrl,
    amazonScraping,
    onScrapeAmazonUrl,
    newShopeeFeed,
    setNewShopeeFeed,
    onAddShopeeFeed,
    onRemoveShopeeFeed,
}: AffiliateSettingsProps) {
    return (
        <div className="space-y-6">
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
                        onClick={() => onTest('amazon')}
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
                            {Object.values(AMAZON_REGIONS).map(region => (
                                <option key={region} value={region}>
                                    {AMAZON_REGION_LABELS[region] || region}
                                </option>
                            ))}
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
                                onClick={onScrapeAmazonUrl}
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
                        onClick={onTestMlConnection}
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
                                    onClick={onStartMlOAuth}
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
                                        onClick={onRefreshMlToken}
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
                                        onClick={onStartMlOAuth}
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

                        {/* Manual OAuth Code Input */}
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
                                        onClick={onExchangeMlOAuthCode}
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
                                    onClick={onScrapeCustomUrl}
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
                        <Label htmlFor="mlRedirectUri">Redirect URI (Callback)</Label>
                        <Input
                            id="mlRedirectUri"
                            value={config.mercadolivre.redirectUri || ""}
                            onChange={(e) => setConfig({ ...config, mercadolivre: { ...config.mercadolivre, redirectUri: e.target.value } })}
                            placeholder="https://voxelpromo.com ou https://proplaynews.com.br/"
                        />
                        <p className="text-xs text-muted-foreground">
                            Deve ser idêntica à URL configurada no seu aplicativo do Mercado Livre.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mlAffiliateCode">Social Link (Recomendado)</Label>
                        <Input
                            id="mlAffiliateCode"
                            value={config.mercadolivre.affiliateCode}
                            onChange={(e) => setConfig({ ...config, mercadolivre: { ...config.mercadolivre, affiliateCode: e.target.value } })}
                            placeholder="https://www.mercadolivre.com.br/social/seu_usuario?matt_tool=..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Cole seu Social Link completo do painel de afiliados. Parâmetros <code>matt_tool</code> e <code>matt_word</code> serão extraídos automaticamente.
                        </p>
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
                    <CardTitle className="flex items-center gap-2">
                        <span className="text-[#EE4D2D] font-bold">S</span> Shopee
                    </CardTitle>
                    <CardDescription>Configure a integração com Shopee Affiliate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* API Configuration */}
                    <div className="space-y-4 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Integração API (GraphQL)</Label>
                                <p className="text-xs text-muted-foreground">
                                    Conecte-se diretamente à API para ofertas em tempo real.
                                </p>
                            </div>
                            <Switch
                                checked={config.shopee?.apiEnabled || false}
                                onCheckedChange={(checked) => setConfig({
                                    ...config,
                                    shopee: { ...config.shopee, apiEnabled: checked }
                                })}
                            />
                        </div>

                        {(config.shopee?.apiEnabled) && (
                            <div className="grid gap-4 bg-muted/30 p-4 rounded-lg animation-all duration-200">
                                <div className="space-y-2">
                                    <Label htmlFor="shopeeAppId">App ID</Label>
                                    <Input
                                        id="shopeeAppId"
                                        value={config.shopee.appId || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            shopee: { ...config.shopee, appId: e.target.value }
                                        })}
                                        placeholder="Ex: 123456"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shopeeAppSecret">App Secret</Label>
                                    <Input
                                        id="shopeeAppSecret"
                                        type="password"
                                        value={config.shopee.appSecret || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            shopee: { ...config.shopee, appSecret: e.target.value }
                                        })}
                                        placeholder="Sua chave secreta"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Obtenha em: <a href="https://open-api.affiliate.shopee.com.br/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Shopee Open API Portal</a>
                                </p>
                            </div>
                        )}
                    </div>
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
                            <Button onClick={onAddShopeeFeed} size="icon">
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
                                        onClick={() => onRemoveShopeeFeed(index)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Awin Affiliate Network */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-xl">🔗</span>
                            Awin Affiliate Network
                        </CardTitle>
                        <CardDescription>Configure sua conta de publisher Awin para acessar feeds de produtos</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTest('awin')}
                        disabled={testing === 'awin'}
                        className="gap-2"
                    >
                        {testing === 'awin' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                        Testar
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            💡 <strong>Dica:</strong> A Awin oferece Product Feeds com links de afiliados prontos!
                            Configure sua API Key e acesse milhares de produtos de anunciantes como Kabum, oBoticário, Magazine Luiza e mais.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="awinEnabled" className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="awinEnabled"
                                checked={config.awin?.enabled || false}
                                onChange={(e) => setConfig({
                                    ...config,
                                    awin: { ...config.awin, enabled: e.target.checked }
                                })}
                                className="rounded"
                            />
                            Habilitar Awin
                        </Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="awinApiToken">API Token</Label>
                        <Input
                            id="awinApiToken"
                            type="password"
                            value={config.awin?.apiToken || ""}
                            onChange={(e) => setConfig({
                                ...config,
                                awin: { ...config.awin, apiToken: e.target.value }
                            })}
                            placeholder="Seu token de API da Awin"
                        />
                        <p className="text-xs text-muted-foreground">
                            Encontre em: Awin → Toolbox → API Credentials
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="awinPublisherId">Publisher ID</Label>
                        <Input
                            id="awinPublisherId"
                            value={config.awin?.publisherId || ""}
                            onChange={(e) => setConfig({
                                ...config,
                                awin: { ...config.awin, publisherId: e.target.value }
                            })}
                            placeholder="Ex: 2676068"
                        />
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            📦 Product Feeds (Recomendado)
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                            Acesse feeds CSV completos com produtos e links de afiliados prontos.
                        </p>

                        <div className="space-y-2">
                            <Label htmlFor="awinDataFeedApiKey">Data Feed API Key</Label>
                            <Input
                                id="awinDataFeedApiKey"
                                type="password"
                                value={config.awin?.dataFeedApiKey || ""}
                                onChange={(e) => setConfig({
                                    ...config,
                                    awin: { ...config.awin, dataFeedApiKey: e.target.value }
                                })}
                                placeholder="Chave para acessar Product Feeds"
                            />
                            <p className="text-xs text-muted-foreground">
                                Encontre em: Awin → Toolbox → Create-a-Feed → API Key
                            </p>
                        </div>
                    </div>

                    {/* Instructions Dropdown */}
                    <details className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <summary className="text-sm font-medium cursor-pointer">📋 Como configurar a Awin</summary>
                        <ol className="mt-2 text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Acesse <a href="https://ui.awin.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">ui.awin.com</a> e faça login</li>
                            <li>Vá em Toolbox → API Credentials para obter o API Token</li>
                            <li>Seu Publisher ID está no canto superior direito</li>
                            <li>Para Product Feeds: Toolbox → Create-a-Feed → copie a API Key</li>
                            <li>Após configurar, use os endpoints /api/awin/feeds para listar feeds</li>
                        </ol>
                    </details>
                </CardContent>
            </Card>
        </div>
    );
}

