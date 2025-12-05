import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntegrationModal } from "@/components/integrations/IntegrationModal";
import { WhatsAppModal } from "@/components/integrations/WhatsAppModal";
import api from "@/services/api";
import { FaTelegram, FaDiscord, FaWhatsapp, FaXTwitter } from "react-icons/fa6";

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  posts: number;
  color: string;
}

export function SocialPlatforms() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>([
    { id: "twitter", name: "X (Twitter)", icon: <FaXTwitter className="w-5 h-5 text-white" />, connected: false, posts: 0, color: "bg-black" },
    { id: "telegram", name: "Telegram", icon: <FaTelegram className="w-5 h-5 text-white" />, connected: true, posts: 0, color: "bg-[#0088cc]" },
    { id: "discord", name: "Discord", icon: <FaDiscord className="w-5 h-5 text-white" />, connected: false, posts: 0, color: "bg-[#5865F2]" },
    { id: "whatsapp", name: "WhatsApp", icon: <FaWhatsapp className="w-5 h-5 text-white" />, connected: false, posts: 0, color: "bg-[#25D366]" },
  ]);

  useEffect(() => {
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
            case 'whatsapp':
              isConnected = !!config.whatsapp?.enabled;
              break;
            case 'discord':
              isConnected = !!config.discord?.webhookUrl;
              break;
          }

          return {
            ...p,
            connected: isConnected,
            posts: p.id === 'telegram' ? posted : 0
          };
        }));

        // Also check WhatsApp connection status from API (overrides config)
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
        console.error("Error fetching platform status:", error);
      }
    };

    fetchStatus();
  }, []);

  const handleOpenConfig = (platform: Platform) => {
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
  };

  const handleCloseWhatsAppModal = () => {
    setIsWhatsAppModalOpen(false);
    // Refresh WhatsApp status after closing modal
    api.get('/whatsapp/status').then(response => {
      setPlatforms(prev => prev.map(p =>
        p.id === 'whatsapp' ? { ...p, connected: response.data?.isReady || false } : p
      ));
    }).catch(console.error);
  };

  return (
    <>
      <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Plataformas Conectadas</h3>
        </div>

        <div className="space-y-3">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl transition-all group",
                platform.connected
                  ? "bg-secondary/50 hover:bg-secondary"
                  : "bg-secondary/20"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl", platform.color)}>
                  {platform.icon}
                </div>
                <div>
                  <p className="font-medium text-foreground">{platform.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {platform.connected ? `${platform.posts} publicações` : "Não conectado"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenConfig(platform)}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-background/50 transition-all"
                  title="Configurar"
                >
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                </button>

                <button
                  onClick={() => handleOpenConfig(platform)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    platform.connected
                      ? "bg-success/10 text-success hover:bg-success/20"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {platform.connected ? "Ativo" : "Conectar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard integrations modal */}
      <IntegrationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        platform={selectedPlatform}
      />

      {/* WhatsApp QR Code modal */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={handleCloseWhatsAppModal}
      />
    </>
  );
}
