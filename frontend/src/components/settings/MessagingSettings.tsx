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

export function MessagingSettings({ config, setConfig, testing, onTest }: MessagingSettingsProps) {
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
