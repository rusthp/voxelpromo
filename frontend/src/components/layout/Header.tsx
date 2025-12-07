import { useState } from "react";
import { Search, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewProductModal } from "@/components/products/NewProductModal";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { ThemeToggle } from "@/components/theme";
import { UserDropdown } from "./UserDropdown";

interface HeaderProps {
  onMenuClick?: () => void;
  onProductAdded?: () => void;
}

export function Header({ onMenuClick, onProductAdded }: HeaderProps) {
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="h-full flex items-center justify-between px-6">
          {/* Mobile Menu Button */}
          <button
            className="md:hidden mr-4 p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Search */}
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar produtos, integrações..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="glow"
              size="sm"
              className="gap-2 hidden sm:flex"
              onClick={() => setIsNewProductModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>

            <ThemeToggle />

            <NotificationDropdown />

            <UserDropdown />
          </div>
        </div>
      </header>

      {/* New Product Modal */}
      <NewProductModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        onProductAdded={onProductAdded}
      />
    </>
  );
}


