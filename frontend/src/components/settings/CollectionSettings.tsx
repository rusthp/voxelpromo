import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Rss, Plus, Trash2, Package } from "lucide-react";
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
    // Get current sources from config or use all by default
    const enabledSources = config.collection?.sources || ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'];

    const toggleSource = (sourceId: string) => {
        const currentSources = config.collection?.sources || ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'];
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

