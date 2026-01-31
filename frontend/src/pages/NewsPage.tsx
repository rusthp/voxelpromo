import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Sparkles,
    Megaphone,
    Wrench,
    Zap,
    Rocket,
    Calendar,
    Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

interface NewsItem {
    _id: string;
    title: string;
    content: string;
    type: 'feature' | 'fix' | 'announcement' | 'improvement';
    publishedAt: string;
    tags: string[];
}

const NewsPage = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchNews();
    }, [filterType]);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filterType !== "all") queryParams.append("type", filterType);

            const response = await fetch(`/api/news?${queryParams.toString()}`);
            const data = await response.json();

            if (data.success) {
                setNews(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch news:", error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'feature': return <Rocket className="h-5 w-5 text-green-500" />;
            case 'fix': return <Wrench className="h-5 w-5 text-red-500" />;
            case 'announcement': return <Megaphone className="h-5 w-5 text-blue-500" />;
            case 'improvement': return <Zap className="h-5 w-5 text-yellow-500" />;
            default: return <Sparkles className="h-5 w-5 text-purple-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'feature': return "Nova Funcionalidade";
            case 'fix': return "Correção";
            case 'announcement': return "Anúncio";
            case 'improvement': return "Melhoria";
            default: return type;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'feature': return "bg-green-500/10 text-green-500 border-green-500/20";
            case 'fix': return "bg-red-500/10 text-red-500 border-red-500/20";
            case 'announcement': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case 'improvement': return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            default: return "bg-purple-500/10 text-purple-500 border-purple-500/20";
        }
    };

    const filteredNews = news.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(var(--voxel-cyan))] via-[hsl(var(--voxel-pink))] to-[hsl(var(--voxel-orange))] flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold">VoxelPromo</span>
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                                Novidades
                            </span>
                        </Link>
                        <Link to="/">
                            <Button variant="ghost" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
                        O que há de novo?
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Acompanhe as últimas atualizações, melhorias e correções da plataforma VoxelPromo.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar atualizações..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os tipos</SelectItem>
                            <SelectItem value="feature">Funcionalidades</SelectItem>
                            <SelectItem value="improvement">Melhorias</SelectItem>
                            <SelectItem value="fix">Correções</SelectItem>
                            <SelectItem value="announcement">Anúncios</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Timeline */}
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredNews.length === 0 ? (
                        <div className="text-center py-12 bg-card/30 rounded-lg border border-border/50 backdrop-blur-sm">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                                <Megaphone className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Nenhuma novidade encontrada</h3>
                            <p className="text-muted-foreground">
                                Tente ajustar seus filtros de busca.
                            </p>
                        </div>
                    ) : (
                        filteredNews.map((item) => (
                            <div key={item._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                {/* Icon */}
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform hover:scale-110">
                                    {getTypeIcon(item.type)}
                                </div>

                                {/* Content */}
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all hover:border-primary/20">
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant="outline" className={`${getTypeColor(item.type)}`}>
                                            {getTypeLabel(item.type)}
                                        </Badge>
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {format(new Date(item.publishedAt), "d 'de' MMMM, yyyy", { locale: ptBR })}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                                        {item.title}
                                    </h3>
                                    <div
                                        className="text-muted-foreground text-sm prose prose-sm dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: item.content }}
                                    />
                                    {item.tags && item.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
                                            {item.tags.map(tag => (
                                                <span key={tag} className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
            {/* Footer */}
            <footer className="border-t border-border py-8 mt-12">
                <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                    © {new Date().getFullYear()} VoxelPromo. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    );
};

export default NewsPage;
