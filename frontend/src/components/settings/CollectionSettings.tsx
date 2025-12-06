import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Rss, Plus, Trash2 } from "lucide-react";
import { ConfigState } from "@/types/settings";

interface CollectionSettingsProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
    newRssFeed: string;
    setNewRssFeed: (value: string) => void;
    onAddRssFeed: () => void;
    onRemoveRssFeed: (index: number) => void;
}

export function CollectionSettings({
    config,
    setConfig,
    newRssFeed,
    setNewRssFeed,
    onAddRssFeed,
    onRemoveRssFeed
}: CollectionSettingsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurações de Coleta</CardTitle>
                <CardDescription>
                    Configure o comportamento da coleta de ofertas (em breve)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
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
                        Adicione URLs de feeds RSS de sites de promoções (ex: Pelando, Promobit) para coletar ofertas automaticamente.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
