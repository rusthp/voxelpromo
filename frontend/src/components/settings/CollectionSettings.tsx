import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Rss, Plus, Trash2, Package, Link } from "lucide-react";
import { FaAmazon } from "react-icons/fa";
import { SiAliexpress, SiMercadopago } from "react-icons/si";
import { ConfigState } from "@/types/settings";

interface CollectionSettingsProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
    newRssFeed: string;
    setNewRssFeed: (value: string) => void;
    onAddRssFeed: () => void;
    onRemoveRssFeed: (index: number) => void;
}

const COLLECTION_SOURCES = [
    { id: 'amazon', name: 'Amazon', icon: FaAmazon, color: 'text-[#FF9900]' },
    { id: 'aliexpress', name: 'AliExpress', icon: SiAliexpress, color: 'text-[#E62E04]' },
    { id: 'mercadolivre', name: 'Mercado Livre', icon: SiMercadopago, color: 'text-[#FFE600]' },
    { id: 'shopee', name: 'Shopee', icon: Package, color: 'text-[#EE4D2D]' },
    { id: 'awin', name: 'Awin', icon: Link, color: 'text-blue-500' },
    { id: 'rss', name: 'RSS Feeds', icon: Rss, color: 'text-orange-500' },
];

export function CollectionSettings({
    config,
    setConfig,
    newRssFeed,
    setNewRssFeed,
    onAddRssFeed,
    onRemoveRssFeed
}: CollectionSettingsProps) {
    // Parse initial schedule to determine mode
    const [scheduleMode, setScheduleMode] = useState<'simple' | 'advanced'>('advanced');
    const [simpleHours, setSimpleHours] = useState<number>(6);

    useEffect(() => {
        const schedule = config.collection?.schedule || '0 */6 * * *';
        const match = schedule.match(/^0 \*\/(\d+) \* \* \*$/);

        if (match) {
            setScheduleMode('simple');
            setSimpleHours(parseInt(match[1]));
        } else {
            setScheduleMode('advanced');
        }
    }, []); // Run once on mount

    const handleSimpleHoursChange = (hours: number) => {
        // Clamp between 1 and 23
        const h = Math.max(1, Math.min(23, hours));
        setSimpleHours(h);
        setConfig({
            ...config,
            collection: {
                ...config.collection,
                schedule: `0 */${h} * * *`
            }
        });
    };



    // Helper functions for sources
    const enabledSources = config.collection?.sources || ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'awin', 'rss'];

    const toggleSource = (sourceId: string) => {
        const currentSources = config.collection?.sources || ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'awin', 'rss'];
        const newSources = currentSources.includes(sourceId)
            ? currentSources.filter(s => s !== sourceId)
            : [...currentSources, sourceId];

        setConfig({
            ...config,
            collection: {
                ...config.collection,
                sources: newSources,
                enabled: config.collection?.enabled ?? true
            }
        });
    };

    const isSourceEnabled = (sourceId: string) => enabledSources.includes(sourceId);

    const handleModeChange = (mode: 'simple' | 'advanced') => {
        setScheduleMode(mode);
        if (mode === 'simple') {
            // Restore last known simple hours or default to 6
            const newSchedule = `0 */${simpleHours} * * *`;
            setConfig({
                ...config,
                collection: {
                    ...config.collection,
                    schedule: newSchedule
                }
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurações de Coleta</CardTitle>
                <CardDescription>
                    Escolha quais fontes serão usadas na coleta automática de produtos
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Source Toggles */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                        <Package className="w-4 h-4" /> Fontes de Coleta
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {COLLECTION_SOURCES.map((source) => {
                            const Icon = source.icon;
                            const enabled = isSourceEnabled(source.id);
                            return (
                                <div
                                    key={source.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${enabled ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-5 h-5 ${source.color}`} />
                                        <span className="font-medium">{source.name}</span>
                                    </div>
                                    <Switch
                                        checked={enabled}
                                        onCheckedChange={() => toggleSource(source.id)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        💡 Desabilite fontes que não deseja coletar para economizar tempo e recursos.
                    </p>
                </div>

                {/* Schedule Configuration */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <span className="w-4 h-4 flex items-center justify-center">🕒</span> Agendamento
                        </h3>
                        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                            <button
                                onClick={() => handleModeChange('simple')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${scheduleMode === 'simple' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Simples
                            </button>
                            <button
                                onClick={() => handleModeChange('advanced')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${scheduleMode === 'advanced' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Avançado
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {scheduleMode === 'simple' ? (
                            <div className="p-4 rounded-lg border bg-card/50 space-y-3">
                                <Label htmlFor="simpleInterval">Intervalo entre coletas (Horas)</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="simpleInterval"
                                        type="number"
                                        min={1}
                                        max={23}
                                        value={simpleHours}
                                        onChange={(e) => handleSimpleHoursChange(parseInt(e.target.value) || 6)}
                                        className="w-24 text-center font-bold text-lg"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        O sistema irá buscar novas ofertas a cada <strong>{simpleHours} horas</strong>.
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                    <span className="font-mono">Cron gerado: 0 */{simpleHours} * * *</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="collectionSchedule">Cronograma (Cron Expression)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="collectionSchedule"
                                        value={config.collection?.schedule || '0 */6 * * *'}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            collection: {
                                                ...config.collection,
                                                schedule: e.target.value
                                            }
                                        })}
                                        placeholder="0 */6 * * *"
                                        className="font-mono"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Define a frequência da coleta automática (ex: <code>0 */6 * * *</code> para a cada 6 horas).
                                    <br />
                                    Use <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">crontab.guru</a> para ajuda.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RSS Feeds (only show if RSS is enabled) */}
                {isSourceEnabled('rss') && (
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <Rss className="w-4 h-4" /> Feeds RSS Gerais
                        </h3>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://exemplo.com/rss..."
                                value={newRssFeed}
                                onChange={(e) => setNewRssFeed(e.target.value)}
                            />
                            <Button onClick={onAddRssFeed} size="icon">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {(!config.rss || config.rss.length === 0) && (
                                <p className="text-sm text-muted-foreground italic">Nenhum feed RSS configurado</p>
                            )}
                            {(config.rss || []).map((url, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md text-sm">
                                    <span className="truncate flex-1 mr-2">{url}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive/80"
                                        onClick={() => onRemoveRssFeed(index)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Adicione URLs de feeds RSS de sites de promoções (ex: Pelando, Promobit).
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

