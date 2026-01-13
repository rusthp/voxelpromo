import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
    MoreHorizontal,
    Plus,
    Pencil,
    Trash,
    Eye,
    EyeOff,
    Rocket,
    Wrench,
    Megaphone,
    Zap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { NewsEditor } from "./NewsEditor";

interface NewsItem {
    _id: string;
    title: string;
    content: string;
    type: 'feature' | 'fix' | 'announcement' | 'improvement';
    published: boolean;
    publishedAt: string;
    tags: string[];
}

export const NewsList = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NewsItem | null>(null);

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/news/admin/all?limit=100', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setNews(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch news:", error);
            toast.error("Erro ao carregar novidades");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta novidade?")) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/news/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Novidade excluída");
                fetchNews();
            } else {
                toast.error("Erro ao excluir");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir");
        }
    };

    const handleTogglePublish = async (item: NewsItem) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/news/${item._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ published: !item.published })
            });

            if (response.ok) {
                toast.success(item.published ? "Novidade despublicada" : "Novidade publicada");
                fetchNews();
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao alterar status");
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'feature': return <Rocket className="h-4 w-4 text-green-500" />;
            case 'fix': return <Wrench className="h-4 w-4 text-red-500" />;
            case 'announcement': return <Megaphone className="h-4 w-4 text-blue-500" />;
            case 'improvement': return <Zap className="h-4 w-4 text-yellow-500" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Gerenciar Novidades</h2>
                <Button onClick={() => { setEditingItem(null); setIsEditorOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Novidade
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    Carregando...
                                </TableCell>
                            </TableRow>
                        ) : news.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Nenhuma novidade encontrada
                                </TableCell>
                            </TableRow>
                        ) : (
                            news.map((item) => (
                                <TableRow key={item._id}>
                                    <TableCell>
                                        <Badge variant={item.published ? "default" : "secondary"}>
                                            {item.published ? "Publicado" : "Rascunho"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 capitalize">
                                            {getTypeIcon(item.type)}
                                            {item.type}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.title}</TableCell>
                                    <TableCell>
                                        {format(new Date(item.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => { setEditingItem(item); setIsEditorOpen(true); }}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleTogglePublish(item)}>
                                                    {item.published ? (
                                                        <>
                                                            <EyeOff className="mr-2 h-4 w-4" /> Despublicar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="mr-2 h-4 w-4" /> Publicar
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => handleDelete(item._id)}
                                                >
                                                    <Trash className="mr-2 h-4 w-4" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <NewsEditor
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                newsItem={editingItem}
                onSave={fetchNews}
            />
        </div>
    );
};
