import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    CheckCircle2,
    Circle,
    Bot,
    Zap,
    MessageSquare,
    Package,
    ArrowRight,
    X,
    Sparkles
} from "lucide-react";
import api from "@/services/api";

interface SetupStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface SetupStatus {
    telegram: { configured: boolean; botUsername?: string };
    ai: { configured: boolean; provider?: string };
    whatsapp: { configured: boolean; connected?: boolean };
    offers: { hasOffers: boolean; count?: number };
    automation: { configured: boolean; enabled?: boolean };
}

export function OnboardingChecklist() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<SetupStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already dismissed
        const isDismissed = localStorage.getItem("onboarding_dismissed");
        if (isDismissed === "true") {
            setDismissed(true);
            setLoading(false);
            return;
        }

        fetchSetupStatus();
    }, []);

    const fetchSetupStatus = async () => {
        try {
            const response = await api.get("/config/setup-status");
            setStatus(response.data);
        } catch (error) {
            console.error("Error fetching setup status:", error);
            // Fallback: try to infer from health endpoint
            try {
                const health = await api.get("/health");
                setStatus({
                    telegram: { configured: health.data.services?.telegram === "configured" },
                    ai: { configured: health.data.services?.ai === "configured" },
                    whatsapp: { configured: health.data.services?.whatsapp === "configured" },
                    offers: { hasOffers: false },
                    automation: { configured: false },
                });
            } catch {
                setStatus(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem("onboarding_dismissed", "true");
        setDismissed(true);
    };

    const handleReset = () => {
        localStorage.removeItem("onboarding_dismissed");
        setDismissed(false);
        fetchSetupStatus();
    };

    if (loading || dismissed || !status) {
        return null;
    }

    const steps: SetupStep[] = [
        {
            id: "ai",
            title: "Configurar IA",
            description: status.ai.configured
                ? `${status.ai.provider || "Groq"} configurado`
                : "Configure a IA para gerar textos criativos",
            completed: status.ai.configured,
            href: "/settings?tab=ai",
            icon: Sparkles,
        },
        {
            id: "telegram",
            title: "Configurar Telegram",
            description: status.telegram.configured
                ? `@${status.telegram.botUsername || "bot"} conectado`
                : "Conecte o bot do Telegram",
            completed: status.telegram.configured,
            href: "/settings?tab=messaging",
            icon: Bot,
        },
        {
            id: "whatsapp",
            title: "Conectar WhatsApp",
            description: status.whatsapp.connected
                ? "WhatsApp conectado"
                : "Opcional: conecte via QR code",
            completed: status.whatsapp.connected || false,
            href: "/settings?tab=messaging",
            icon: MessageSquare,
        },
        {
            id: "offers",
            title: "Coletar ofertas",
            description: status.offers.hasOffers
                ? `${status.offers.count || 0} ofertas coletadas`
                : "Faça sua primeira coleta de produtos",
            completed: status.offers.hasOffers,
            href: "/products",
            icon: Package,
        },
        {
            id: "automation",
            title: "Ativar automação",
            description: status.automation.enabled
                ? "Automação ativa"
                : "Configure postagens automáticas",
            completed: status.automation.enabled || false,
            href: "/settings?tab=automation",
            icon: Zap,
        },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / steps.length) * 100);

    // If all completed, show success and allow dismiss
    if (progress === 100) {
        return (
            <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-green-600 dark:text-green-400">
                                🎉 Configuração completa!
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Seu sistema está pronto para coletar e publicar ofertas.
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleDismiss}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 overflow-hidden">
            <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="truncate">Primeiros passos</span>
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                        Configure seu sistema para começar a publicar
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                        {completedCount}/{steps.length}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
                        <X className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            <Progress value={progress} className="h-2 mb-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                {steps.map((step) => (
                    <button
                        key={step.id}
                        onClick={() => navigate(step.href)}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all text-left w-full ${step.completed
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-muted/50 hover:bg-muted text-foreground"
                            }`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.completed
                            ? "bg-green-500/20"
                            : "bg-muted"
                            }`}>
                            {step.completed ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <step.icon className="w-3 h-3 text-muted-foreground" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="text-xs font-medium truncate">
                                {step.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                                {step.description}
                            </p>
                        </div>
                        {!step.completed && (
                            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                    </button>
                ))}
            </div>
        </Card>
    );
}
