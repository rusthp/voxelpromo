import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfigState } from "@/types/settings";
import { AI_PROVIDERS, AI_PROVIDER_LABELS } from "@/constants/channels";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import api from "@/services/api";

interface AISettingsProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
}

export function AISettings({ config, setConfig }: AISettingsProps) {
    const [testingProvider, setTestingProvider] = useState<string | null>(null);

    const testConnection = async (provider: string) => {
        let apiKey = '';

        // Get the current API key based on provider
        if (provider === 'groq') apiKey = config.ai.groqApiKey;
        else if (provider === 'openai') apiKey = config.ai.openaiApiKey;
        else if (provider === 'deepseek') apiKey = config.ai.deepseekApiKey || '';

        if (!apiKey || apiKey === '***') {
            toast.error(`Por favor, insira a API Key do ${AI_PROVIDER_LABELS[provider]} antes de testar`);
            return;
        }

        setTestingProvider(provider);

        try {
            const { data } = await api.post('/ai/test', { provider, apiKey });

            if (data.success) {
                toast.success(data.message);
            } else {
                toast.error(data.error || 'Falha na conexão');
            }
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || 'Erro ao testar conexão';
            toast.error(message);
        } finally {
            setTestingProvider(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuração de IA</CardTitle>
                <CardDescription>
                    Configure os provedores de Inteligência Artificial para geração de posts
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="ai-provider">Provedor Padrão</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
                        O sistema usará este provedor para gerar os posts. Se falhar, usará templates padrão.
                    </div>
                    <select
                        id="ai-provider"
                        className="w-full px-3 py-2 border border-input bg-background rounded-lg mt-2"
                        value={config.ai.provider}
                        onChange={(e) => {
                            setConfig({ ...config, ai: { ...config.ai, provider: e.target.value } });
                        }}
                    >
                        {Object.values(AI_PROVIDERS).map(provider => (
                            <option key={provider} value={provider}>
                                {AI_PROVIDER_LABELS[provider] || provider}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-6">
                    {/* Groq Setting */}
                    <div className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="groqApiKey" className="font-semibold text-base">Groq (Recomendado)</Label>
                            {config.ai.provider === 'groq' && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Ativo</span>}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="groqApiKey"
                                type="password"
                                value={config.ai.groqApiKey}
                                onChange={(e) => setConfig({ ...config, ai: { ...config.ai, groqApiKey: e.target.value } })}
                                placeholder="gsk_..."
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                onClick={() => testConnection('groq')}
                                disabled={testingProvider === 'groq'}
                            >
                                {testingProvider === 'groq' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Rápido e gratuito. Obtenha sua chave em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.groq.com</a>
                        </p>
                    </div>

                    {/* OpenAI Setting */}
                    <div className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="openaiApiKey" className="font-semibold text-base">OpenAI (GPT)</Label>
                            {config.ai.provider === 'openai' && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Ativo</span>}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="openaiApiKey"
                                type="password"
                                value={config.ai.openaiApiKey}
                                onChange={(e) => setConfig({ ...config, ai: { ...config.ai, openaiApiKey: e.target.value } })}
                                placeholder="sk-..."
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                onClick={() => testConnection('openai')}
                                disabled={testingProvider === 'openai'}
                            >
                                {testingProvider === 'openai' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                            </Button>
                        </div>
                    </div>

                    {/* DeepSeek Setting */}
                    <div className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="deepseekApiKey" className="font-semibold text-base">DeepSeek</Label>
                            {config.ai.provider === 'deepseek' && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Ativo</span>}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="deepseekApiKey"
                                type="password"
                                value={config.ai.deepseekApiKey || ''}
                                onChange={(e) => setConfig({ ...config, ai: { ...config.ai, deepseekApiKey: e.target.value } })}
                                placeholder="sk-..."
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                onClick={() => testConnection('deepseek')}
                                disabled={testingProvider === 'deepseek'}
                            >
                                {testingProvider === 'deepseek' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Obtenha sua chave em <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.deepseek.com</a>
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
