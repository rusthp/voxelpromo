import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { Settings2, CheckCircle2, XCircle } from "lucide-react";
import { IntegrationModal, Platform } from "@/components/integrations/IntegrationModal";
import { WhatsAppModal } from "@/components/integrations/WhatsAppModal";
import api from "@/services/api";
import { FaTelegram, FaWhatsapp, FaXTwitter, FaInstagram } from "react-icons/fa6";

interface LocalPlatform extends Platform {
    posts: number;
    description: string;
}

const Integrations = () => {
    const [selectedPlatform, setSelectedPlatform] = useState<LocalPlatform | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [platforms, setPlatforms] = useState<LocalPlatform[]>([
        {
            id: "telegram",
            name: "Telegram",
            icon: <FaTelegram className="w-6 h-6 text-white" />,
            connected: false,
            posts: 0,
            color: "bg-[#0088cc]",
            description: "Envie ofertas automaticamente para canais e grupos."
        },
        {
            id: "twitter",
            name: "X (Twitter)",
            icon: <FaXTwitter className="w-6 h-6 text-white" />,
            connected: false,
            posts: 0,
            color: "bg-black",
            description: "Publique tweets com links de afiliados."
        },
        {
            id: "instagram",
            name: "Instagram",
            icon: <FaInstagram className="w-6 h-6 text-white" />,
            connected: false,
            posts: 0,
            color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
            description: "Responda DMs e comentários automaticamente."
        },
        {
            id: "whatsapp",
            name: "WhatsApp",
            icon: <FaWhatsapp className="w-6 h-6 text-white" />,
            connected: false,
            posts: 0,
            color: "bg-[#25D366]",
            description: "Envie mensagens para grupos de ofertas."
        },
    ]);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            // Fetch stats for post counts
            const statsResponse = await api.get('/stats');
            const { posted } = statsResponse.data;

            // Fetch config for connection status
            const configResponse = await api.get('/config');
            const config = configResponse.data;

            setPlatforms(prev => prev.map(p => {
                let isConnected = false;

                switch (p.id) {
                    case 'telegram':
                        isConnected = !!config.telegram?.botToken;
                        break;
                    case 'twitter':
                        isConnected = !!(config.x?.bearerToken || config.x?.apiKey);
                        break;
                    case 'instagram':
                        isConnected = !!config.instagram?.accessToken;
                        break;
                    case 'whatsapp':
                        isConnected = !!config.whatsapp?.enabled;
                        break;
                }

                return {
                    ...p,
                    connected: isConnected,
                    posts: p.id === 'telegram' ? posted : 0 // Placeholder for per-platform stats if not available
                };
            }));

            // Also check WhatsApp connection status from API
            try {
                const whatsappResponse = await api.get('/whatsapp/status');
                if (whatsappResponse.data?.isReady) {
                    setPlatforms(prev => prev.map(p =>
                        p.id === 'whatsapp' ? { ...p, connected: true } : p
                    ));
                }
            } catch (err) {
                // WhatsApp status check failed, use config value
            }
        } catch (error) {
            console.error("Error fetching integration status:", error);
        }
    };

    const handleOpenConfig = (platform: LocalPlatform) => {
        if (platform.id === 'whatsapp') {
            setIsWhatsAppModalOpen(true);
        } else {
            setSelectedPlatform(platform);
            setIsModalOpen(true);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedPlatform(null);
        fetchStatus(); // Refresh status when modal closes
    };

    const handleCloseWhatsAppModal = () => {
        setIsWhatsAppModalOpen(false);
        fetchStatus(); // Refresh status when modal closes
    };

    return (
        <Layout>
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {platforms.map((platform) => (
                        <div
                            key={platform.id}
                            className="glass rounded-2xl p-6 flex flex-col justify-between h-48 hover:border-primary/30 transition-all duration-300 group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl", platform.color)}>
                                        {platform.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-foreground">{platform.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {platform.connected ? (
                                                <span className="flex items-center gap-1 text-xs text-success font-medium bg-success/10 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3" /> Conectado
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-full">
                                                    <XCircle className="w-3 h-3" /> Desconectado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleOpenConfig(platform)}
                                    className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <Settings2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {platform.description}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">
                                        <span className="text-foreground">{platform.posts}</span>
                                        <span className="text-muted-foreground ml-1">publicações</span>
                                    </div>

                                    <button
                                        onClick={() => handleOpenConfig(platform)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                            platform.connected
                                                ? "bg-secondary text-foreground hover:bg-secondary/80"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                        )}
                                    >
                                        {platform.connected ? "Gerenciar" : "Conectar"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <IntegrationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                platform={selectedPlatform}
            />
            <WhatsAppModal
                isOpen={isWhatsAppModalOpen}
                onClose={handleCloseWhatsAppModal}
            />
        </Layout>
    );
};

export default Integrations;
