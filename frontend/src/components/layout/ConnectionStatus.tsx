import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { Bot, MessageSquare, Zap, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConnectionStatusData {
    telegram: { connected: boolean; botUsername?: string };
    whatsapp: { connected: boolean };
    automation: { active: boolean };
}

interface ConnectionStatusProps {
    collapsed?: boolean;
}

export function ConnectionStatus({ collapsed = false }: ConnectionStatusProps) {
    const [status, setStatus] = useState<ConnectionStatusData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();
        // Poll every 30 seconds
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const [telegramRes, whatsappRes, automationRes] = await Promise.allSettled([
                api.get("/telegram/status"),
                api.get("/whatsapp/status"),
                api.get("/automation/status"),
            ]);

            setStatus({
                telegram: {
                    connected: telegramRes.status === "fulfilled" && telegramRes.value.data?.success,
                    botUsername: telegramRes.status === "fulfilled" ? telegramRes.value.data?.botUsername : undefined,
                },
                whatsapp: {
                    connected: whatsappRes.status === "fulfilled" && whatsappRes.value.data?.authenticated,
                },
                automation: {
                    active: automationRes.status === "fulfilled" && automationRes.value.data?.isActive,
                },
            });
        } catch (error) {
            console.error("Error fetching connection status:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={cn(
                "px-4 py-3 border-t border-sidebar-border",
                collapsed && "px-2"
            )}>
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
            </div>
        );
    }

    if (!status) return null;

    const connections = [
        {
            id: "telegram",
            icon: Bot,
            label: "Telegram",
            connected: status.telegram.connected,
            tooltip: status.telegram.connected
                ? `@${status.telegram.botUsername || "bot"} conectado`
                : "Telegram não conectado",
        },
        {
            id: "whatsapp",
            icon: MessageSquare,
            label: "WhatsApp",
            connected: status.whatsapp.connected,
            tooltip: status.whatsapp.connected ? "WhatsApp conectado" : "WhatsApp desconectado",
        },
        {
            id: "automation",
            icon: Zap,
            label: "Automação",
            connected: status.automation.active,
            tooltip: status.automation.active ? "Automação ativa" : "Automação parada",
        },
    ];

    if (collapsed) {
        return (
            <div className="absolute bottom-16 left-0 right-0 px-2 py-2 border-t border-sidebar-border">
                <div className="flex flex-col items-center gap-2">
                    {connections.map((conn) => (
                        <Tooltip key={conn.id}>
                            <TooltipTrigger asChild>
                                <div className="relative">
                                    <conn.icon className={cn(
                                        "w-4 h-4",
                                        conn.connected ? "text-green-500" : "text-muted-foreground"
                                    )} />
                                    <span className={cn(
                                        "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
                                        conn.connected ? "bg-green-500" : "bg-muted-foreground"
                                    )} />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                {conn.tooltip}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="absolute bottom-16 left-0 right-0 px-4 py-3 border-t border-sidebar-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Conexões</p>
            <div className="space-y-1">
                {connections.map((conn) => (
                    <div key={conn.id} className="flex items-center gap-2">
                        <span className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            conn.connected ? "bg-green-500" : "bg-muted-foreground"
                        )} />
                        <conn.icon className={cn(
                            "w-3.5 h-3.5",
                            conn.connected ? "text-green-500" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                            "text-xs",
                            conn.connected ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {conn.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
