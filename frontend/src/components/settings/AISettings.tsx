import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfigState } from "@/types/settings";
import { AI_PROVIDERS, AI_PROVIDER_LABELS } from "@/constants/channels";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface AISettingsProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
}

export function AISettings({ config, setConfig }: AISettingsProps) {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const testConnection = async () => {
        const provider = config.ai.provider;
        let apiKey = '';

        // Get the current API key based on provider
        if (provider === 'groq') apiKey = config.ai.groqApiKey;
        else if (provider === 'openai') apiKey = config.ai.openaiApiKey;
        else if (provider === 'deepseek') apiKey = config.ai.deepseekApiKey || '';

        if (!apiKey || apiKey === '***') {
            toast.error('Por favor, insira a API Key antes de testar');
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const response = await fetch('/api/ai/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, apiKey }),
            });

            const data = await response.json();

            if (data.success) {
                setTestResult({ success: true, message: data.message });
                toast.success(data.message);
            } else {
                setTestResult({ success: false, message: data.error || 'Erro desconhecido' });
                toast.error(data.error || 'Falha na conexão');
            }
        } catch (error: any) {
            const message = error.message || 'Erro ao testar conexão';
            setTestResult({ success: false, message });
            toast.error(message);
        } finally {
            setTesting(false);
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
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="ai-provider">Provedor Padrão</Label>
                    <select
                        id="ai-provider"
                        className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                        value={config.ai.provider}
                        onChange={(e) => {
                            setConfig({ ...config, ai: { ...config.ai, provider: e.target.value } });
                            setTestResult(null);
                        }}
                    >
                        {Object.values(AI_PROVIDERS).map(provider => (
                            <option key={provider} value={provider}>
                                {AI_PROVIDER_LABELS[provider] || provider}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Groq API Key */}
                <div className="space-y-2">
                    <Label htmlFor="groqApiKey">Groq API Key</Label>
                    <Input
                        id="groqApiKey"
                        type="password"
                        value={config.ai.groqApiKey}
                        onChange={(e) => setConfig({ ...config, ai: { ...config.ai, groqApiKey: e.target.value } })}
                        placeholder="gsk_..."
                    />
                    <p className="text-xs text-muted-foreground">
                        Obtenha sua chave em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.groq.com</a>
                    </p>
                </div>

                {/* OpenAI API Key */}
                <div className="space-y-2">
                    <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                    <Input
                        id="openaiApiKey"
                        type="password"
                        value={config.ai.openaiApiKey}
                        onChange={(e) => setConfig({ ...config, ai: { ...config.ai, openaiApiKey: e.target.value } })}
                        placeholder="sk-..."
                    />
                </div>

                {/* DeepSeek API Key */}
                <div className="space-y-2">
                    <Label htmlFor="deepseekApiKey">DeepSeek API Key</Label>
                    <Input
                        id="deepseekApiKey"
                        type="password"
                        value={config.ai.deepseekApiKey || ''}
                        onChange={(e) => setConfig({ ...config, ai: { ...config.ai, deepseekApiKey: e.target.value } })}
                        placeholder="sk-..."
                    />
                    <p className="text-xs text-muted-foreground">
                        Obtenha sua chave em <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.deepseek.com</a>
                    </p>
                </div>

                {/* Test Connection Button */}
                <div className="pt-2 flex items-center gap-4">
                    <Button
                        onClick={testConnection}
                        disabled={testing}
                        variant="outline"
                    >
                        {testing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Testando...
                            </>
                        ) : (
                            'Testar Conexão'
                        )}
                    </Button>
                    {testResult && (
                        <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                            {testResult.success ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            <span>{testResult.message}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
