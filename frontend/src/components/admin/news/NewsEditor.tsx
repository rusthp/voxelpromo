import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface NewsItem {
    _id?: string;
    title: string;
    content: string;
    type: 'feature' | 'fix' | 'announcement' | 'improvement';
    published: boolean;
    tags: string[];
}

interface NewsEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    newsItem: NewsItem | null;
    onSave: () => void;
}

export function NewsEditor({ open, onOpenChange, newsItem, onSave }: NewsEditorProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<NewsItem>({
        title: "",
        content: "",
        type: "feature",
        published: true,
        tags: []
    });

    useEffect(() => {
        if (newsItem) {
            setFormData(newsItem);
        } else {
            setFormData({
                title: "",
                content: "",
                type: "feature",
                published: true,
                tags: []
            });
        }
    }, [newsItem, open]);

    const handleChange = (field: keyof NewsItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTagsChange = (value: string) => {
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag !== "");
        setFormData(prev => ({ ...prev, tags }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const url = newsItem?._id
                ? `/api/news/${newsItem._id}`
                : '/api/news';

            const method = newsItem?._id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Falha ao salvar');

            toast.success(newsItem ? 'Novidade atualizada!' : 'Novidade criada!');
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar novidade');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{newsItem ? 'Editar Novidade' : 'Nova Novidade'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                            id="title"
                            required
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => handleChange('type', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="feature">Funcionalidade (Feature)</SelectItem>
                                <SelectItem value="fix">Correção (Fix)</SelectItem>
                                <SelectItem value="announcement">Anúncio</SelectItem>
                                <SelectItem value="improvement">Melhoria</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">Conteúdo (HTML suportado)</Label>
                        <Textarea
                            id="content"
                            required
                            className="min-h-[150px]"
                            value={formData.content}
                            onChange={(e) => handleChange('content', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Você pode usar tags HTML simples para formatação (b, i, ul, li, br).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                        <Input
                            id="tags"
                            value={formData.tags.join(', ')}
                            onChange={(e) => handleTagsChange(e.target.value)}
                            placeholder="ex: admin, dashboard, payment"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="published"
                            checked={formData.published}
                            onCheckedChange={(checked) => handleChange('published', checked)}
                        />
                        <Label htmlFor="published">Publicado imediatamente</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
