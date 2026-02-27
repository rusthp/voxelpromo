import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ExpirationBanner } from "@/components/billing/ExpirationBanner";
import { cn } from "@/lib/utils";

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            <Sidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            <main
                className={cn(
                    "transition-all duration-300 min-h-screen",
                    // Desktop padding
                    collapsed ? "md:pl-20" : "md:pl-64",
                    // Mobile padding (none)
                    "pl-0"
                )}
            >
                <Header onMenuClick={() => setMobileOpen(true)} />
                <ExpirationBanner />
                {children}
            </main>
        </div>
    );
}
