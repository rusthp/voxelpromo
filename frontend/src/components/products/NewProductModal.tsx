import { useState } from "react";
import { X, Loader2, Link2, Edit3, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/services/api";

interface NewProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProductAdded?: () => void;
}

interface ProductForm {
    title: string;
    price: string;
    originalPrice: string;
    link: string;
    image: string;
    source: string;
    category: string;
}

const initialForm: ProductForm = {
    title: "",
    price: "",
    originalPrice: "",
    link: "",
    image: "",
    source: "manual",
    category: "",
};

export function NewProductModal({ isOpen, onClose, onProductAdded }: NewProductModalProps) {
    const [activeTab, setActiveTab] = useState("manual");
    const [form, setForm] = useState<ProductForm>(initialForm);
    const [urlToScrape, setUrlToScrape] = useState("");
    const [isScraping, setIsScraping] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleFormChange = (field: keyof ProductForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const detectSource = (url: string): string => {
        if (url.includes("amazon.com")) return "amazon";
        if (url.includes("mercadolivre.com") || url.includes("mercadolibre.com")) return "mercadolivre";
        if (url.includes("aliexpress.com")) return "aliexpress";
        if (url.includes("shopee.com")) return "shopee";
        return "other";
    };

    const handleScrapeUrl = async () => {
        if (!urlToScrape.trim()) {
            toast.error("Cole uma URL para coletar o produto.");
            return;
        }

        const source = detectSource(urlToScrape);

        try {
            setIsScraping(true);
            toast.info("🕷️ Coletando dados do produto...");

            let endpoint = "";
            if (source === "amazon") {
                endpoint = "/amazon/scrape-product";
            } else if (source === "mercadolivre") {
                endpoint = "/mercadolivre/scrape-url";
            } else {
                toast.error("URL não suportada. Use links da Amazon ou Mercado Livre.");
                return;
            }

            const response = await api.post(endpoint, { url: urlToScrape });

            if (response.data?.success) {
                const product = response.data.product || response.data;

                setForm({
                    title: product.title || "",
                    price: String(product.price || product.current_price || ""),
                    originalPrice: String(product.originalPrice || product.original_price || ""),
                    link: product.affiliateLink || product.affiliate_link || urlToScrape,
                    image: product.image || product.thumbnail || "",
                    source: source,
                    category: product.category || "",
                });

                toast.success("✅ Produto coletado! Revise os dados e salve.");
                setActiveTab("manual"); // Switch to manual to review/edit
            } else {
                toast.error(response.data?.error || "Erro ao coletar produto.");
            }
        } catch (error: any) {
            console.error("Error scraping product:", error);
            toast.error(error.response?.data?.error || "Erro ao coletar produto.");
        } finally {
            setIsScraping(false);
        }
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            toast.error("Título é obrigatório.");
            return;
        }
        if (!form.price) {
            toast.error("Preço é obrigatório.");
            return;
        }
        if (!form.link.trim()) {
            toast.error("Link é obrigatório.");
            return;
        }

        try {
            setIsSaving(true);

            const offer = {
                title: form.title,
                description: "",
                price: parseFloat(form.price),
                original_price: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
                discount_percentage: form.originalPrice && form.price
                    ? Math.round((1 - parseFloat(form.price) / parseFloat(form.originalPrice)) * 100)
                    : undefined,
                link: form.link,
                image: form.image || undefined,
                source: form.source,
                category: form.category || undefined,
                collected_at: new Date().toISOString(),
            };

            await api.post("/offers", offer);

            toast.success("🎉 Produto adicionado com sucesso!");
            setForm(initialForm);
            setUrlToScrape("");
            onProductAdded?.();
            onClose();
        } catch (error: any) {
            console.error("Error saving product:", error);
            toast.error(error.response?.data?.error || "Erro ao salvar produto.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setForm(initialForm);
        setUrlToScrape("");
        setActiveTab("manual");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 glass rounded-2xl animate-slide-up overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">Novo Produto</h2>
                            <p className="text-sm text-muted-foreground">Adicione um produto manualmente ou por URL</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-xl hover:bg-secondary transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="manual" className="gap-2">
                            <Edit3 className="w-4 h-4" />
                            Manual
                        </TabsTrigger>
                        <TabsTrigger value="url" className="gap-2">
                            <Link2 className="w-4 h-4" />
                            Coletar por URL
                        </TabsTrigger>
                    </TabsList>

                    {/* URL Tab */}
                    <TabsContent value="url" className="space-y-4">
                        <div className="space-y-2">
                            <Label>URL do Produto</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://www.amazon.com.br/dp/..."
                                    value={urlToScrape}
                                    onChange={(e) => setUrlToScrape(e.target.value)}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleScrapeUrl}
                                    disabled={isScraping || !urlToScrape.trim()}
                                    className="gap-2"
                                >
                                    {isScraping ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ExternalLink className="w-4 h-4" />
                                    )}
                                    Coletar
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-secondary/50 text-sm text-muted-foreground">
                            <p className="font-medium mb-2">URLs suportadas:</p>
                            <ul className="list-disc ml-4 space-y-1">
                                <li>Amazon (amazon.com.br, amazon.com)</li>
                                <li>Mercado Livre (mercadolivre.com.br)</li>
                            </ul>
                            <p className="mt-2 text-xs">
                                💡 O link de afiliado será gerado automaticamente!
                            </p>
                        </div>
                    </TabsContent>

                    {/* Manual Tab */}
                    <TabsContent value="manual" className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título *</Label>
                            <Input
                                id="title"
                                placeholder="Nome do produto"
                                value={form.title}
                                onChange={(e) => handleFormChange("title", e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Preço Atual (R$) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    placeholder="99.90"
                                    value={form.price}
                                    onChange={(e) => handleFormChange("price", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="originalPrice">Preço Original (R$)</Label>
                                <Input
                                    id="originalPrice"
                                    type="number"
                                    step="0.01"
                                    placeholder="199.90"
                                    value={form.originalPrice}
                                    onChange={(e) => handleFormChange("originalPrice", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="link">Link do Produto (Afiliado) *</Label>
                            <Input
                                id="link"
                                placeholder="https://..."
                                value={form.link}
                                onChange={(e) => handleFormChange("link", e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image">URL da Imagem</Label>
                            <Input
                                id="image"
                                placeholder="https://..."
                                value={form.image}
                                onChange={(e) => handleFormChange("image", e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="source">Fonte</Label>
                                <select
                                    id="source"
                                    className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground"
                                    value={form.source}
                                    onChange={(e) => handleFormChange("source", e.target.value)}
                                >
                                    <option value="manual">Manual</option>
                                    <option value="amazon">Amazon</option>
                                    <option value="mercadolivre">Mercado Livre</option>
                                    <option value="aliexpress">AliExpress</option>
                                    <option value="shopee">Shopee</option>
                                    <option value="other">Outro</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Categoria</Label>
                                <Input
                                    id="category"
                                    placeholder="Eletrônicos, Casa..."
                                    value={form.category}
                                    onChange={(e) => handleFormChange("category", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Preview */}
                        {form.image && (
                            <div className="mt-4 p-4 rounded-xl bg-secondary/30">
                                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                                <img
                                    src={form.image}
                                    alt="Preview"
                                    className="w-20 h-20 object-cover rounded-lg"
                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-secondary/30">
                    <Button variant="outline" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant="glow"
                        onClick={handleSave}
                        disabled={isSaving || !form.title || !form.price || !form.link}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            "Salvar Produto"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
