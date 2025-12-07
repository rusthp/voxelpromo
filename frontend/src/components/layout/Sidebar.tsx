import {
  LayoutDashboard,
  Package,
  Share2,
  Settings,
  BarChart3,
  Zap,
  ChevronLeft,
  X,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Package, label: "Produtos", href: "/products" },
  { icon: Share2, label: "Publicações", href: "/publications" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Zap, label: "Integrações", href: "/integrations" },
  { icon: User, label: "Meu Perfil", href: "/profile" },
  { icon: Settings, label: "Configurações", href: "/settings" },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const activeItem = location.pathname;

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50",
          collapsed ? "w-20" : "w-64",
          // Mobile styles
          "md:translate-x-0", // Always visible on desktop
          !mobileOpen && "-translate-x-full md:translate-x-0" // Hidden on mobile unless open
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center w-full")}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow">
              <span className="text-primary-foreground font-bold text-xl">V</span>
            </div>
            {!collapsed && (
              <span className="font-bold text-lg text-foreground">VoxelPromo</span>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-2 rounded-lg hover:bg-sidebar-accent transition-colors hidden md:block",
              collapsed && "hidden"
            )}
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors md:hidden"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)} // Close on navigate (mobile)
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                activeItem === item.href
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                collapsed && "justify-center px-3"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapse button for collapsed state (Desktop only) */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-lg hover:bg-sidebar-accent transition-colors hidden md:block"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
          </button>
        )}
      </aside>
    </>
  );
}
