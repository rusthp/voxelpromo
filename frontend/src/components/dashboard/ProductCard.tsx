import { ExternalLink, Share2, Trash2, Package, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Source configuration with colors and icons
const sourceConfig: Record<string, { color: string; bg: string; label: string }> = {
  mercadolivre: { color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", label: "MERCADO LIVRE" },
  shopee: { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", label: "SHOPEE" },
  aliexpress: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", label: "ALIEXPRESS" },
  amazon: { color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", label: "AMAZON" },
  rss: { color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", label: "RSS" },
  awin: { color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20", label: "AWIN" },
  default: { color: "text-muted-foreground", bg: "bg-secondary", label: "OUTRO" },
};

interface ProductCardProps {
  id: string;
  name: string;
  company: string;
  brand?: string;
  price: string;
  originalPrice?: string;
  discount: string;
  image: string;
  platforms: string[];
  delay?: number;
  onDelete?: (id: string) => void;
  onPublish?: (id: string) => void;
  productUrl?: string;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export function ProductCard({
  id,
  name,
  company,
  brand,
  price,
  originalPrice,
  discount,
  image,
  platforms,
  delay = 0,
  onDelete,
  onPublish,
  productUrl,
  selected = false,
  onSelect
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  // Get source config based on company (source)
  const source = company?.toLowerCase().replace(/\s+/g, '') || 'default';
  const config = sourceConfig[source] || sourceConfig.default;

  return (
    <div
      className={`glass rounded-2xl overflow-hidden animate-slide-up transition-all duration-300 group relative ${selected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/30'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect?.(id, e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        />
      </div>

      {/* Image */}
      <div className="relative h-48 bg-secondary overflow-hidden">
        {image && !imageError ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="w-12 h-12 opacity-50" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg">
          {discount}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Source Badge with Color */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.color}`}>
            <Package className="w-3 h-3" />
            {config.label}
          </div>
          {brand && (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={brand}>
              {brand}
            </span>
          )}
        </div>

        <h3 className="text-foreground font-semibold mt-2 line-clamp-2 h-12" title={name}>{name}</h3>

        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-2xl font-bold text-primary">{price}</span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">{originalPrice}</span>
          )}
        </div>

        {/* Platforms */}
        <div className="flex items-center gap-2 mt-4 min-h-[24px]">
          {platforms.map((platform) => (
            <span
              key={platform}
              className="px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground"
            >
              {platform}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="glow"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onPublish?.(id)}
          >
            <Share2 className="w-4 h-4" />
            Publicar
          </Button>

          {productUrl && (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => window.open(productUrl, '_blank')}
              title="Ver no site"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete?.(id)}
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
