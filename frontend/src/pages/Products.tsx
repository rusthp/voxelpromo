import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { PublishModal } from "@/components/products/PublishModal";
import api from "@/services/api";
import { Loader2, RefreshCw, Filter, SortAsc, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    brand?: string;
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
    const [searchTerm, setSearchTerm] = useState('');

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

            setSelectedOffers(new Set());
            toast.success("Ofertas excluídas! Atualizando lista...");

            // Force refresh: directly fetch page 1 from server
            setPage(1);
            setHasMore(true);

            const url = `/offers?limit=20&skip=0&sortBy=${sortBy}${selectedSource !== 'all' ? `&sources=${selectedSource}` : ''}`;
            const productsResponse = await api.get(url);
            setProducts(productsResponse.data);

            if (productsResponse.data.length < 20) {
                setHasMore(false);
            }
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

            // Show persistent loading toast
            const loadingToast = toast.loading("Coletando produtos... Isso pode levar até 2 minutos.", {
                description: "Aguarde enquanto buscamos ofertas de todas as fontes.",
            });

            const response = await api.post('/collector/run-all');
            const result = response.data;

            // Dismiss loading toast
            toast.dismiss(loadingToast);

            // Show success toast with details
            toast.success(`Coleta finalizada! ${result.total} produtos coletados.`, {
                description: `Shopee: ${result.shopee || 0} | ML: ${result.mercadolivre || 0} | Amazon: ${result.amazon || 0}`,
                duration: 5000,
            });

            // Force refresh: directly fetch page 1 from server
            setPage(1);
            setHasMore(true);
            setSelectedOffers(new Set());

            // Small delay to ensure database has committed all writes
            await new Promise(resolve => setTimeout(resolve, 500));

            // Fetch directly with page 1 to avoid stale closure
            const url = `/offers?limit=20&skip=0&sortBy=${sortBy}${selectedSource !== 'all' ? `&sources=${selectedSource}` : ''}`;
            const productsResponse = await api.get(url);
            setProducts(productsResponse.data);

            if (productsResponse.data.length < 20) {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error collecting products:", error);
            toast.error("Erro ao coletar produtos. Tente novamente.");
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
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <h1 className="text-2xl font-bold text-foreground">Produtos Coletados</h1>

                        <div className="flex gap-2 w-full md:w-auto flex-wrap">
                            {/* Search Input */}
                            <div className="relative flex-1 md:flex-none md:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Buscar produtos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-background"
                                />
                            </div>

                            <Select value={selectedSource} onValueChange={handleSourceChange}>
                                <SelectTrigger className="w-[140px] bg-background">
                                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Fonte" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="amazon">Amazon</SelectItem>
                                    <SelectItem value="shopee">Shopee</SelectItem>
                                    <SelectItem value="aliexpress">AliExpress</SelectItem>
                                    <SelectItem value="mercadolivre">M. Livre</SelectItem>
                                    <SelectItem value="awin">Awin</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={sortBy} onValueChange={handleSortChange}>
                                <SelectTrigger className="w-[140px] bg-background">
                                    <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Ordenar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Recentes</SelectItem>
                                    <SelectItem value="discount">Desconto</SelectItem>
                                    <SelectItem value="price_asc">Menor Preço</SelectItem>
                                    <SelectItem value="price_desc">Maior Preço</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
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
                    <>
                        {/* Filter products by search term */}
                        {(() => {
                            const filteredProducts = searchTerm
                                ? products.filter(p =>
                                    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    p.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
                                )
                                : products;

                            if (filteredProducts.length === 0 && searchTerm) {
                                return (
                                    <div className="text-center py-12 text-muted-foreground">
                                        Nenhum produto encontrado para "{searchTerm}"
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredProducts.map((product, index) => (
                                        <ProductCard
                                            key={product._id}
                                            id={product._id}
                                            name={product.title}
                                            company={product.source}
                                            brand={product.brand}
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
                            );
                        })()}
                    </>
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
