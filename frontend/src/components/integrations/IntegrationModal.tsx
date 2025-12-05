import { useState } from "react";
import { X, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { FaTelegram, FaDiscord, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import api from "@/services/api";

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: Platform | null;
}

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password";
  helpText?: string;
}

const platformFields: Record<string, FieldConfig[]> = {
  twitter: [
    { key: "apiKey", label: "API Key", placeholder: "Sua API Key do X", type: "password" },
    { key: "apiSecret", label: "API Secret", placeholder: "Sua API Secret", type: "password" },
    { key: "accessToken", label: "Access Token", placeholder: "Seu Access Token", type: "password" },
    { key: "accessTokenSecret", label: "Access Token Secret", placeholder: "Seu Access Token Secret", type: "password" },
  ],
  telegram: [
    { key: "botToken", label: "Bot Token", placeholder: "Token do @BotFather", type: "password", helpText: "Obtenha em @BotFather no Telegram" },
    { key: "chatId", label: "Chat/Channel ID", placeholder: "-100xxxxxxxxxx", type: "text", helpText: "ID do grupo ou canal para publicar" },
  ],
  discord: [
    { key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/...", type: "password", helpText: "Configurações do canal → Integrações → Webhooks" },
    { key: "botToken", label: "Bot Token (opcional)", placeholder: "Token do bot Discord", type: "password", helpText: "Para funcionalidades avançadas" },
  ],
  whatsapp: [
    { key: "phoneNumberId", label: "Phone Number ID", placeholder: "ID do número no Meta Business", type: "text" },
    { key: "accessToken", label: "Access Token", placeholder: "Token de acesso da API", type: "password", helpText: "Obtenha no Meta for Developers" },
    { key: "businessAccountId", label: "Business Account ID", placeholder: "ID da conta Business", type: "text" },
  ],
};

const platformDocs: Record<string, string> = {
  twitter: "https://developer.twitter.com/en/docs/twitter-api",
  telegram: "https://core.telegram.org/bots/api",
  discord: "https://discord.com/developers/docs/intro",
  whatsapp: "https://developers.facebook.com/docs/whatsapp",
};

// Platform icons map
const platformIcons: Record<string, React.ReactNode> = {
  twitter: <FaXTwitter className="w-6 h-6 text-white" />,
  telegram: <FaTelegram className="w-6 h-6 text-white" />,
  discord: <FaDiscord className="w-6 h-6 text-white" />,
  whatsapp: <FaWhatsapp className="w-6 h-6 text-white" />,
};

// Platform colors map
const platformColors: Record<string, string> = {
  twitter: "bg-black",
  telegram: "bg-[#0088cc]",
  discord: "bg-[#5865F2]",
  whatsapp: "bg-[#25D366]",
};

export function IntegrationModal({ isOpen, onClose, platform }: IntegrationModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  if (!isOpen || !platform) return null;

  const fields = platformFields[platform.id] || [];

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setTestStatus("idle");
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestConnection = async () => {
    try {
      setTestStatus("testing");

      // Map platform IDs to backend service names
      const serviceMap: Record<string, string> = {
        'telegram': 'telegram',
        'twitter': 'x',
        'whatsapp': 'whatsapp',
        'discord': 'discord'
      };

      const service = serviceMap[platform.id];
      if (!service) {
        throw new Error(`Platform ${platform.id} not supported for testing`);
      }

      const response = await api.post('/config/test', { service });
      const result = response.data[service];

      if (result?.success) {
        setTestStatus("success");
        toast({
          title: "Conexão bem sucedida!",
          description: result.message || `Credenciais do ${platform.name} validadas.`,
        });
      } else {
        setTestStatus("error");
        toast({
          title: "Falha na conexão",
          description: result?.message || "Verifique suas credenciais e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestStatus("error");
      const errorMsg = error.response?.data?.message || error.message || "Erro ao testar conexão";
      toast({
        title: "Falha na conexão",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Map formData to backend config structure
      let configUpdate: any = {};

      if (platform.id === 'telegram') {
        configUpdate.telegram = {
          botToken: formData.botToken || '',
          chatId: formData.chatId || '',
        };
      } else if (platform.id === 'twitter') {
        configUpdate.x = {
          apiKey: formData.apiKey || '',
          apiKeySecret: formData.apiSecret || '',
          accessToken: formData.accessToken || '',
          accessTokenSecret: formData.accessTokenSecret || '',
        };
      } else if (platform.id === 'whatsapp') {
        configUpdate.whatsapp = {
          enabled: true,
          phoneNumberId: formData.phoneNumberId || '',
          accessToken: formData.accessToken || '',
          businessAccountId: formData.businessAccountId || '',
        };
      } else if (platform.id === 'discord') {
        configUpdate.discord = {
          webhookUrl: formData.webhookUrl || '',
          botToken: formData.botToken || '',
        };
      }

      await api.post('/config', configUpdate);

      toast({
        title: "Integração salva!",
        description: `${platform.name} foi configurado com sucesso.`,
      });
      onClose();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Erro ao salvar configuração";
      toast({
        title: "Erro ao salvar",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    toast({
      title: "Integração desconectada",
      description: `${platform.name} foi removido.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 glass rounded-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", platformColors[platform.id] || platform.color)}>
              {platformIcons[platform.id] || platform.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Configurar {platform.name}</h2>
              <p className="text-sm text-muted-foreground">
                {platform.connected ? "Editar credenciais" : "Conectar nova integração"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="w-full h-11 px-4 pr-12 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords[field.key] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}
            </div>
          ))}

          {/* Documentation Link */}
          <a
            href={platformDocs[platform.id]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline mt-4"
          >
            <ExternalLink className="w-4 h-4" />
            Ver documentação da API
          </a>

          {/* Test Status */}
          {testStatus !== "idle" && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-xl text-sm",
              testStatus === "testing" && "bg-info/10 text-info",
              testStatus === "success" && "bg-success/10 text-success",
              testStatus === "error" && "bg-destructive/10 text-destructive"
            )}>
              {testStatus === "testing" && (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Testando conexão...
                </>
              )}
              {testStatus === "success" && (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Conexão estabelecida com sucesso!
                </>
              )}
              {testStatus === "error" && (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Falha ao conectar. Verifique as credenciais.
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-secondary/30">
          {platform.connected ? (
            <Button variant="ghost" onClick={handleDisconnect} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              Desconectar
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testStatus === "testing"}
            >
              {testStatus === "testing" ? "Testando..." : "Testar Conexão"}
            </Button>
            <Button
              variant="glow"
              onClick={handleSave}
              disabled={isLoading || testStatus === "testing"}
            >
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
