import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import api from "@/services/api";
import { toast } from "sonner";

interface Publication {
    _id: string;
    title: string;
    source: string;
    currentPrice: number;
    originalPrice: number;
    discountPercentage: number;
    imageUrl: string;
    productUrl: string;
    affiliateUrl: string;
    createdAt: string;
}

const Publications = () => {
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sourceFilter, setSourceFilter] = useState("all");

    useEffect(() => {
        fetchPublications();
    }, []);

    const fetchPublications = async () => {
        try {
            setLoading(true);
            // Fetch only posted offers
            const response = await api.get('/offers?isPosted=true&limit=100');
            setPublications(response.data);
        } catch (error) {
            console.error("Error fetching publications:", error);
            toast.error("Erro ao carregar publicações.");
        } finally {
            setLoading(false);
        }
    };

    // Get unique sources for filter
    const sources = Array.from(new Set(publications.map(p => p.source)));

    // Filter publications
    const filteredPublications = publications.filter(pub => {
        const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSource = sourceFilter === "all" || pub.source === sourceFilter;
        return matchesSearch && matchesSource;
    });

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Publicações</h1>
                        <p className="text-muted-foreground">Histórico de ofertas publicadas</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por título..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filtrar por origem" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as origens</SelectItem>
                                {sources.map(source => (
                                    <SelectItem key={source} value={source}>
                                        {source}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Publications List */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredPublications.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        {searchTerm || sourceFilter !== "all"
                            ? "Nenhuma publicação encontrada com os filtros aplicados."
                            : "Nenhuma oferta foi publicada ainda."}
                    </div>
                ) : (
                    <>
                        <div className="text-sm text-muted-foreground mb-4">
                            Mostrando {filteredPublications.length} de {publications.length} publicações
                        </div>
                        <div className="grid gap-4">
                            {filteredPublications.map((pub) => (
                                <div
                                    key={pub._id}
                                    className="glass rounded-xl p-4 hover:border-primary/30 transition-all duration-300"
                                >
                                    <div className="flex gap-4">
                                        {pub.imageUrl && (
                                            <img
                                                src={pub.imageUrl}
                                                alt={pub.title}
                                                className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96';
                                                }}
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground mb-1 truncate">
                                                {pub.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-success"></span>
                                                    {pub.source}
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(pub.createdAt).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-lg font-bold text-success">
                                                        R$ {pub.currentPrice.toFixed(2)}
                                                    </span>
                                                    {pub.originalPrice && (
                                                        <span className="text-sm text-muted-foreground line-through">
                                                            R$ {pub.originalPrice.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                                {pub.discountPercentage && (
                                                    <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                                                        -{Math.round(pub.discountPercentage)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <a
                                                href={pub.affiliateUrl || pub.productUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm text-center whitespace-nowrap"
                                            >
                                                Ver Oferta
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Publications;
