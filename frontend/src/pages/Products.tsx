import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { PublishModal } from "@/components/products/PublishModal";
import api from "@/services/api";
import { Loader2, RefreshCw, Filter, SortAsc } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Offer {
    _id: string;
    title: string;
    source: string;
    currentPrice: number;
    originalPrice: number;
    discountPercentage: number;
    imageUrl: string;
    productUrl: string;
    affiliateUrl?: string;
    isPosted: boolean;
}

const Products = () => {
    const [products, setProducts] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [collecting, setCollecting] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [sortBy, setSortBy] = useState('newest');
    const [selectedSource, setSelectedSource] = useState('all');
    const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());

    // Publish Modal State
    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            let url = `/offers?limit=20&skip=${(page - 1) * 20}&sortBy=${sortBy}`;

            if (selectedSource !== 'all') {
                url += `&sources=${selectedSource}`;
            }

            const response = await api.get(url);
            const newProducts = response.data;

            if (newProducts.length < 20) {
                setHasMore(false);
            }

            setProducts(prev => page === 1 ? newProducts : [...prev, ...newProducts]);
        } catch (error) {
            console.error("Error fetching products:", error);
            toast.error("Erro ao carregar produtos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [page, sortBy, selectedSource]);

    const handleSortChange = (value: string) => {
        setSortBy(value);
        setPage(1);
        setProducts([]);
    };

    const handleSourceChange = (value: string) => {
        setSelectedSource(value);
        setPage(1);
        setProducts([]);
    };

    const handleSelect = (id: string, selected: boolean) => {
        const newSelected = new Set(selectedOffers);
        if (selected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedOffers(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedOffers.size === products.length && products.length > 0) {
            setSelectedOffers(new Set());
        } else {
            const newSelected = new Set(products.map(p => p._id));
            setSelectedOffers(newSelected);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedOffers.size === 0) return;
        if (!confirm(`Tem certeza que deseja excluir ${selectedOffers.size} ofertas selecionadas?`)) return;

        try {
            setLoading(true);
            await api.delete('/offers', { data: { offerIds: Array.from(selectedOffers) } });

            setProducts(prev => prev.filter(p => !selectedOffers.has(p._id)));
            setSelectedOffers(new Set());
            toast.success("Ofertas selecionadas excluídas com sucesso.");
        } catch (error) {
            console.error("Error deleting selected offers:", error);
            toast.error("Erro ao excluir ofertas selecionadas.");
        } finally {
            setLoading(false);
        }
    };

    const handleCollect = async () => {
        try {
            setCollecting(true);
            toast.info("Iniciando coleta de produtos...");

            const response = await api.post('/collector/run-all');
            const result = response.data;

            toast.success(`Coleta finalizada! ${result.total} novos produtos encontrados.`);

            // Refresh list
            setPage(1);
            fetchProducts();
        } catch (error) {
            console.error("Error collecting products:", error);
            toast.error("Erro ao coletar produtos.");
        } finally {
            setCollecting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta oferta?")) return;

        try {
            await api.delete(`/offers/${id}`);
            setProducts(prev => prev.filter(p => p._id !== id));
            toast.success("Oferta excluída com sucesso.");
        } catch (error) {
            console.error("Error deleting offer:", error);
            toast.error("Erro ao excluir oferta.");
        }
    };

    const handlePublishClick = (id: string) => {
        setSelectedOfferId(id);
        setPublishModalOpen(true);
    };

    const handlePublishSuccess = () => {
        // Update the product status locally
        if (selectedOfferId) {
            setProducts(prev => prev.map(p =>
                p._id === selectedOfferId ? { ...p, isPosted: true } : p
            ));
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("ATENÇÃO: Isso apagará TODOS os produtos coletados permanentemente. Tem certeza?")) return;

        try {
            setLoading(true);
            const response = await api.delete('/offers/all?permanent=true');
            toast.success(response.data.message || "Todos os produtos foram apagados.");
            setProducts([]);
            setPage(1);
            setHasMore(false);
            setSelectedOffers(new Set());
        } catch (error) {
            console.error("Error deleting all offers:", error);
            toast.error("Erro ao apagar produtos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h1 className="text-2xl font-bold text-foreground">Produtos Coletados</h1>

                        <div className="flex gap-3">
                            <div className="hidden md:flex items-center gap-2">
                                <Select value={selectedSource} onValueChange={handleSourceChange}>
                                    <SelectTrigger className="w-[180px] bg-background">
                                        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder="Filtrar por Fonte" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Fontes</SelectItem>
                                        <SelectItem value="amazon">Amazon</SelectItem>
                                        <SelectItem value="shopee">Shopee</SelectItem>
                                        <SelectItem value="aliexpress">AliExpress</SelectItem>
                                        <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Select value={sortBy} onValueChange={handleSortChange}>
                                    <SelectTrigger className="w-[180px] bg-background">
                                        <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder="Ordenar por" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Mais Recentes</SelectItem>
                                        <SelectItem value="discount">Maior Desconto</SelectItem>
                                        <SelectItem value="price_asc">Menor Preço</SelectItem>
                                        <SelectItem value="price_desc">Maior Preço</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {selectedOffers.size > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSelected}
                                disabled={loading}
                                className="animate-in fade-in zoom-in duration-200"
                            >
                                Excluir ({selectedOffers.size})
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={handleSelectAll}
                            disabled={products.length === 0}
                        >
                            {selectedOffers.size === products.length && products.length > 0 ? "Desmarcar Todos" : "Selecionar Todos"}
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={handleDeleteAll}
                            disabled={collecting || loading || products.length === 0}
                        >
                            Apagar Tudo
                        </Button>
                        <Button
                            onClick={handleCollect}
                            disabled={collecting || loading}
                            className="gap-2"
                        >
                            {collecting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            {collecting ? "Coletando..." : "Coletar Agora"}
                        </Button>
                    </div>
                </div>

                {products.length === 0 && !loading ? (
                    <div className="text-center py-20 text-muted-foreground">
                        Nenhum produto encontrado.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product, index) => (
                            <ProductCard
                                key={product._id}
                                id={product._id}
                                name={product.title}
                                company={product.source}
                                price={`R$ ${product.currentPrice.toFixed(2)}`}
                                originalPrice={product.originalPrice ? `R$ ${product.originalPrice.toFixed(2)}` : undefined}
                                discount={`-${Math.round(product.discountPercentage)}%`}
                                image={product.imageUrl}
                                platforms={product.isPosted ? ['Enviado'] : []}
                                delay={index % 10 * 50}
                                onDelete={handleDelete}
                                onPublish={handlePublishClick}
                                productUrl={product.affiliateUrl || product.productUrl}
                                selected={selectedOffers.has(product._id)}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {!loading && hasMore && (
                    <div className="flex justify-center pt-4">
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                            Carregar Mais
                        </button>
                    </div>
                )}
            </div>

            <PublishModal
                isOpen={publishModalOpen}
                onClose={() => setPublishModalOpen(false)}
                offerId={selectedOfferId}
                onSuccess={handlePublishSuccess}
            />
        </Layout>
    );
};

export default Products;
