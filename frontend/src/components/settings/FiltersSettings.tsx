import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Filter, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

export function FiltersSettings() {
    const [whitelist, setWhitelist] = useState<string[]>([]);
    const [blacklist, setBlacklist] = useState<string[]>([]);
    const [newWhitelist, setNewWhitelist] = useState("");
    const [newBlacklist, setNewBlacklist] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchFilters();
    }, []);

    const fetchFilters = async () => {
        try {
            const response = await api.get('/user/profile');
            const filters = response.data.filters || { whitelist: [], blacklist: [] };
            setWhitelist(filters.whitelist || []);
            setBlacklist(filters.blacklist || []);
        } catch (error) {
            console.error('Error fetching filters:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (newFilters: { whitelist: string[], blacklist: string[] }) => {
        setSaving(true);
        try {
            // Updated to use the correct endpoint for user updates
            await api.put('/user/profile', { filters: newFilters });
            toast({
                title: "Sucesso",
                description: "Filtros atualizados com sucesso!",
            });
        } catch (error) {
            console.error('Error saving filters:', error);
            toast({
                title: "Erro",
                description: "Falha ao salvar filtros.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const addTag = (type: 'whitelist' | 'blacklist') => {
        if (type === 'whitelist') {
            if (!newWhitelist.trim()) return;
            const updated = [...whitelist, newWhitelist.trim()];
            setWhitelist(updated);
            setNewWhitelist("");
            handleSave({ whitelist: updated, blacklist });
        } else {
            if (!newBlacklist.trim()) return;
            const updated = [...blacklist, newBlacklist.trim()];
            setBlacklist(updated);
            setNewBlacklist("");
            handleSave({ whitelist, blacklist: updated });
        }
    };

    const removeTag = (type: 'whitelist' | 'blacklist', index: number) => {
        if (type === 'whitelist') {
            const updated = whitelist.filter((_, i) => i !== index);
            setWhitelist(updated);
            handleSave({ whitelist: updated, blacklist });
        } else {
            const updated = blacklist.filter((_, i) => i !== index);
            setBlacklist(updated);
            handleSave({ whitelist, blacklist: updated });
        }
    };

    if (loading) {
        return <div className="p-8 text-center animate-pulse">Carregando filtros...</div>;
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Filtros de Conteúdo
                </CardTitle>
                <CardDescription>
                    Configure palavras-chave para controlar o que é postado.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Whitelist Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Label className="text-base font-medium text-emerald-500">Whitelist (Obrigatório)</Label>
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30">Posta APENAS se conter</Badge>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ex: gamer, rtx, notebook (pressione Enter)"
                            value={newWhitelist}
                            onChange={(e) => setNewWhitelist(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTag('whitelist')}
                            className="bg-background/50"
                        />
                        <Button onClick={() => addTag('whitelist')} variant="outline" size="icon">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        {whitelist.length === 0 && (
                            <span className="text-sm text-muted-foreground italic">Nenhum termo obrigatório definido (todos permitidos)</span>
                        )}
                        {whitelist.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="flex items-center gap-1 pl-3 pr-1 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0">
                                {tag}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent text-emerald-400/70 hover:text-emerald-400"
                                    onClick={() => removeTag('whitelist', i)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Blacklist Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Label className="text-base font-medium text-red-500">Blacklist (Proibido)</Label>
                        <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30">NUNCA posta se conter</Badge>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ex: +18, bebida, aposta (pressione Enter)"
                            value={newBlacklist}
                            onChange={(e) => setNewBlacklist(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTag('blacklist')}
                            className="bg-background/50"
                        />
                        <Button onClick={() => addTag('blacklist')} variant="outline" size="icon">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                        {blacklist.length === 0 && (
                            <span className="text-sm text-muted-foreground italic">Nenhum termo proibido definido</span>
                        )}
                        {blacklist.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="flex items-center gap-1 pl-3 pr-1 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
                                {tag}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent text-red-400/70 hover:text-red-400"
                                    onClick={() => removeTag('blacklist', i)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
