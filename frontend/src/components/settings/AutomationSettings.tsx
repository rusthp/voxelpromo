import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bot, Play, Pause, Clock, Activity, Send, Package } from "lucide-react";
import { ConfigState, AutomationStatus } from "@/types/settings";
import { MESSAGING_CHANNELS, MESSAGING_CHANNEL_LABELS, AUTOMATION_INTERVALS } from "@/constants/channels";

interface AutomationSettingsProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
    loading: boolean;
    onToggleAutomation: () => void;
    automationStatus?: AutomationStatus;
}

export function AutomationSettings({ config, setConfig, loading, onToggleAutomation, automationStatus }: AutomationSettingsProps) {
    // Format relative time
    const formatRelativeTime = (dateString: string | null | undefined) => {
        if (!dateString) return "Nunca";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Agora";
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        return `${diffDays}d atrás`;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary" />
                        Robô de Automação
                    </CardTitle>
                    <CardDescription>
                        Configure o agendamento automático de postagens
                    </CardDescription>
                </div>
                <Button
                    variant={config.automation.isActive ? "destructive" : "default"}
                    onClick={onToggleAutomation}
                    disabled={loading}
                    className="gap-2"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : config.automation.isActive ? (
                        <Pause className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                    {config.automation.isActive ? "Parar Robô" : "Iniciar Robô"}
                </Button>
            </CardHeader>

            {/* Status Indicator */}
            {automationStatus && (
                <div className="px-6 pb-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Status Badge */}
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${automationStatus.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                <span className={`text-sm font-medium ${automationStatus.isActive ? 'text-green-500' : 'text-muted-foreground'}`}>
                                    {automationStatus.isActive ? 'ATIVO' : 'INATIVO'}
                                </span>
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-border hidden sm:block" />

                            {/* Last Post */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Send className="w-4 h-4" />
                                <span>Último post:</span>
                                <span className="font-medium text-foreground">
                                    {formatRelativeTime(automationStatus.lastPostedAt)}
                                </span>
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-border hidden sm:block" />

                            {/* Posts Today */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Activity className="w-4 h-4" />
                                <span>Hoje:</span>
                                <span className="font-medium text-foreground">
                                    {automationStatus.postsToday ?? 0} posts
                                </span>
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-border hidden sm:block" />

                            {/* Pending */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Package className="w-4 h-4" />
                                <span>Fila:</span>
                                <span className="font-medium text-foreground">
                                    {automationStatus.pendingCount ?? 0} ofertas
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Horários
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startHour">Início (Hora)</Label>
                                <Input
                                    id="startHour"
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={config.automation.startHour}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        automation: { ...config.automation, startHour: parseInt(e.target.value) || 0 }
                                    })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endHour">Fim (Hora)</Label>
                                <Input
                                    id="endHour"
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={config.automation.endHour}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        automation: { ...config.automation, endHour: parseInt(e.target.value) || 0 }
                                    })}
                                />
                            </div>
                        </div>
                        <div className="space-y-4 pt-2 border-t">
                            <Label className="text-base font-semibold">Estratégia de Postagem</Label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Button
                                    variant={(!config.automation.postsPerHour || config.automation.postsPerHour === 0) ? "secondary" : "outline"}
                                    onClick={() => setConfig({
                                        ...config,
                                        automation: { ...config.automation, postsPerHour: 0 }
                                    })}
                                    className="justify-start h-auto py-3 px-4 flex-col items-start gap-1 w-full"
                                >
                                    <span className="font-semibold flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Intervalo Fixo
                                    </span>
                                    <span className="text-xs text-muted-foreground text-left whitespace-normal">
                                        Posta a cada X minutos cravados
                                    </span>
                                </Button>

                                <Button
                                    variant={(config.automation.postsPerHour && config.automation.postsPerHour > 0) ? "secondary" : "outline"}
                                    onClick={() => setConfig({
                                        ...config,
                                        automation: { ...config.automation, postsPerHour: 5 } // Default to 5
                                    })}
                                    className="justify-start h-auto py-3 px-4 flex-col items-start gap-1 w-full"
                                >
                                    <span className="font-semibold flex items-center gap-2">
                                        <Bot className="w-4 h-4" /> Smart Planner
                                    </span>
                                    <span className="text-xs text-muted-foreground text-left whitespace-normal">
                                        Distribui N posts na hora (horários aleatórios)
                                    </span>
                                </Button>
                            </div>

                            {(!config.automation.postsPerHour || config.automation.postsPerHour === 0) ? (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="interval">Intervalo entre Posts</Label>
                                    <select
                                        id="interval"
                                        className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                                        value={config.automation.intervalMinutes}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            automation: { ...config.automation, intervalMinutes: parseInt(e.target.value) || 30 }
                                        })}
                                    >
                                        {AUTOMATION_INTERVALS.map(({ value, label }) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="postsPerHour">Quantidade de Posts por Hora</Label>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        <Input
                                            id="postsPerHour"
                                            type="number"
                                            min="1"
                                            max="60"
                                            className="w-full sm:w-32"
                                            value={config.automation.postsPerHour}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                automation: { ...config.automation, postsPerHour: parseInt(e.target.value) || 1 }
                                            })}
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            posts/hora
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-1">
                                        O robô vai escolher {config.automation.postsPerHour} horários aleatórios dentro de cada hora.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Filtros e Canais</h3>
                        <div className="space-y-2">
                            <Label>Canais Ativos</Label>
                            <div className="flex flex-wrap gap-4 pt-2">
                                {Object.values(MESSAGING_CHANNELS).map(channel => (
                                    <div key={channel} className="flex items-center space-x-2">
                                        <Switch
                                            id={`auto-${channel}`}
                                            checked={config.automation.enabledChannels.includes(channel)}
                                            onCheckedChange={(checked) => {
                                                const channels = checked
                                                    ? [...config.automation.enabledChannels, channel]
                                                    : config.automation.enabledChannels.filter(c => c !== channel);
                                                setConfig({
                                                    ...config,
                                                    automation: { ...config.automation, enabledChannels: channels }
                                                });
                                            }}
                                        />
                                        <Label htmlFor={`auto-${channel}`}>
                                            {MESSAGING_CHANNEL_LABELS[channel] || channel}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2 pt-2">
                            <Label htmlFor="minDiscount">Desconto Mínimo (%)</Label>
                            <Input
                                id="minDiscount"
                                type="number"
                                value={config.automation.minDiscount}
                                onChange={(e) => setConfig({
                                    ...config,
                                    automation: { ...config.automation, minDiscount: parseInt(e.target.value) || 0 }
                                })}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
