import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, CheckCircle, AlertCircle, Loader2, QrCode, Trash2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import api from "@/services/api";
import QRCode from "qrcode";

interface WhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface WhatsAppStatus {
    isReady: boolean;
    hasQRCode: boolean;
    qrCode: string | null;
    qrCodeDataURL: string | null;
    message: string;
}

export function WhatsAppModal({ isOpen, onClose }: WhatsAppModalProps) {
    const [status, setStatus] = useState<WhatsAppStatus>({
        isReady: false,
        hasQRCode: false,
        qrCode: null,
        qrCodeDataURL: null,
        message: "Carregando...",
    });
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

    // Fetch WhatsApp status
    const fetchStatus = useCallback(async () => {
        try {
            const response = await api.get("/whatsapp/status");
            const data = response.data;

            setStatus({
                isReady: data.isReady || false,
                hasQRCode: data.hasQRCode || false,
                qrCode: data.qrCode || null,
                qrCodeDataURL: data.qrCodeDataURL || null,
                message: data.message || "",
            });

            // Generate QR code image from the code string
            if (data.qrCode && !data.qrCodeDataURL) {
                try {
                    const dataUrl = await QRCode.toDataURL(data.qrCode, {
                        width: 280,
                        margin: 2,
                        color: {
                            dark: "#000000",
                            light: "#FFFFFF",
                        },
                    });
                    setQrImageUrl(dataUrl);
                } catch (err) {
                    console.error("Error generating QR image:", err);
                }
            } else if (data.qrCodeDataURL) {
                setQrImageUrl(data.qrCodeDataURL);
            } else {
                setQrImageUrl(null);
            }
        } catch (error: any) {
            console.error("Error fetching WhatsApp status:", error);
            setStatus({
                isReady: false,
                hasQRCode: false,
                qrCode: null,
                qrCodeDataURL: null,
                message: "Erro ao verificar status",
            });
        }
    }, []);

    // Initialize/Generate QR Code
    const handleInitialize = async () => {
        try {
            setIsInitializing(true);
            toast({
                title: "Iniciando WhatsApp...",
                description: "Gerando QR Code, aguarde alguns segundos.",
            });

            const response = await api.post("/whatsapp/initialize");

            if (response.data.qrCode) {
                toast({
                    title: "QR Code gerado!",
                    description: "Escaneie com seu WhatsApp para conectar.",
                });
            } else if (response.data.isReady) {
                toast({
                    title: "WhatsApp já conectado!",
                    description: "Sua sessão está ativa.",
                });
            }

            await fetchStatus();
        } catch (error: any) {
            toast({
                title: "Erro ao inicializar",
                description: error.response?.data?.error || "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsInitializing(false);
        }
    };

    // Clear auth (disconnect)
    const handleDisconnect = async () => {
        try {
            setIsLoading(true);
            await api.delete("/whatsapp/auth");

            toast({
                title: "Desconectado!",
                description: "Sessão do WhatsApp foi encerrada.",
            });

            setStatus({
                isReady: false,
                hasQRCode: false,
                qrCode: null,
                qrCodeDataURL: null,
                message: "Desconectado. Gere um novo QR Code para conectar.",
            });
            setQrImageUrl(null);
        } catch (error: any) {
            toast({
                title: "Erro ao desconectar",
                description: error.response?.data?.error || "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Poll for status while modal is open and not connected
    useEffect(() => {
        if (!isOpen) return;

        fetchStatus();

        // Poll every 3 seconds if not connected
        const interval = setInterval(() => {
            if (!status.isReady) {
                fetchStatus();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [isOpen, status.isReady, fetchStatus]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 glass rounded-2xl animate-slide-up overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#25D366]">
                            <FaWhatsapp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">WhatsApp</h2>
                            <p className="text-sm text-muted-foreground">
                                {status.isReady ? "Conectado" : "Conectar via QR Code"}
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

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status */}
                    <div className={cn(
                        "flex items-center gap-3 p-4 rounded-xl",
                        status.isReady ? "bg-success/10 text-success" : "bg-secondary"
                    )}>
                        {status.isReady ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">Conectado e pronto!</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                                <span className="text-muted-foreground">{status.message}</span>
                            </>
                        )}
                    </div>

                    {/* QR Code Display */}
                    {!status.isReady && (
                        <div className="flex flex-col items-center gap-4">
                            {qrImageUrl ? (
                                <div className="p-4 bg-white rounded-xl">
                                    <img
                                        src={qrImageUrl}
                                        alt="WhatsApp QR Code"
                                        className="w-64 h-64"
                                    />
                                </div>
                            ) : (
                                <div className="w-72 h-72 bg-secondary rounded-xl flex flex-col items-center justify-center gap-4">
                                    <QrCode className="w-16 h-16 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground text-center px-4">
                                        Clique em "Gerar QR Code" para iniciar
                                    </p>
                                </div>
                            )}

                            <p className="text-sm text-muted-foreground text-center">
                                Abra o WhatsApp no seu celular → Dispositivos conectados → Conectar um dispositivo
                            </p>
                        </div>
                    )}

                    {/* Connected State */}
                    {status.isReady && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-success" />
                            </div>
                            <p className="text-lg font-medium text-foreground mb-2">
                                WhatsApp conectado!
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Você pode enviar ofertas para WhatsApp agora.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border bg-secondary/30">
                    {status.isReady ? (
                        <Button
                            variant="ghost"
                            onClick={handleDisconnect}
                            disabled={isLoading}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Desconectar
                        </Button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-3">
                        {!status.isReady && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={fetchStatus}
                                    disabled={isInitializing}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Atualizar
                                </Button>
                                <Button
                                    variant="glow"
                                    onClick={handleInitialize}
                                    disabled={isInitializing}
                                    className="bg-[#25D366] hover:bg-[#128C7E]"
                                >
                                    {isInitializing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="w-4 h-4 mr-2" />
                                            Gerar QR Code
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                        {status.isReady && (
                            <Button variant="outline" onClick={onClose}>
                                Fechar
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
