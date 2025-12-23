/**
 * Advanced toast notifications with icons, actions, and better UX
 * Uses Sonner for modern toast notifications
 */
import { toast as sonnerToast } from "sonner";

interface ToastOptions {
    description?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
    cancel?: {
        label: string;
        onClick?: () => void;
    };
}

/**
 * Enhanced toast notifications with consistent styling and behavior
 */
export const notify = {
    /**
     * Success notification - used for completed actions
     */
    success: (message: string, options?: ToastOptions) => {
        sonnerToast.success(message, {
            description: options?.description,
            duration: options?.duration || 4000,
            action: options?.action
                ? {
                    label: options.action.label,
                    onClick: options.action.onClick,
                }
                : undefined,
            cancel: options?.cancel
                ? {
                    label: options.cancel.label,
                    onClick: options.cancel.onClick,
                }
                : undefined,
        });
    },

    /**
     * Error notification - used for errors and failures
     */
    error: (message: string, options?: ToastOptions) => {
        sonnerToast.error(message, {
            description: options?.description,
            duration: options?.duration || 6000, // Longer for errors
            action: options?.action
                ? {
                    label: options.action.label,
                    onClick: options.action.onClick,
                }
                : undefined,
        });
    },

    /**
     * Warning notification - used for important warnings
     */
    warning: (message: string, options?: ToastOptions) => {
        sonnerToast.warning(message, {
            description: options?.description,
            duration: options?.duration || 5000,
            action: options?.action
                ? {
                    label: options.action.label,
                    onClick: options.action.onClick,
                }
                : undefined,
        });
    },

    /**
     * Info notification - used for general information
     */
    info: (message: string, options?: ToastOptions) => {
        sonnerToast.info(message, {
            description: options?.description,
            duration: options?.duration || 4000,
            action: options?.action
                ? {
                    label: options.action.label,
                    onClick: options.action.onClick,
                }
                : undefined,
        });
    },

    /**
     * Loading notification - shows spinner and can be updated
     * Returns ID for updating/dismissing
     */
    loading: (message: string, options?: { description?: string }) => {
        return sonnerToast.loading(message, {
            description: options?.description,
        });
    },

    /**
     * Promise-based notification - handles loading, success, and error states
     */
    promise: <T,>(
        promise: Promise<T>,
        options: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((err: Error) => string);
        }
    ) => {
        return sonnerToast.promise(promise, options);
    },

    /**
     * Dismiss a specific toast by ID or all toasts
     */
    dismiss: (toastId?: string | number) => {
        sonnerToast.dismiss(toastId);
    },

    // Common pre-configured toasts for VoxelPromo

    /**
     * Offer published successfully
     */
    offerPublished: (channels: string[]) => {
        const channelNames = channels.join(", ");
        sonnerToast.success("🚀 Oferta publicada!", {
            description: `Enviada para: ${channelNames}`,
            duration: 5000,
        });
    },

    /**
     * Offer collected/scraped
     */
    offerCollected: (count: number) => {
        sonnerToast.success(`📦 ${count} oferta${count > 1 ? "s" : ""} coletada${count > 1 ? "s" : ""}!`, {
            duration: 4000,
        });
    },

    /**
     * Settings saved
     */
    settingsSaved: () => {
        sonnerToast.success("⚙️ Configurações salvas!", {
            duration: 3000,
        });
    },

    /**
     * Connection test result
     */
    connectionTest: (service: string, success: boolean, message?: string) => {
        if (success) {
            sonnerToast.success(`✅ ${service} conectado!`, {
                description: message || "Conexão validada com sucesso.",
                duration: 4000,
            });
        } else {
            sonnerToast.error(`❌ Falha ao conectar ${service}`, {
                description: message || "Verifique suas credenciais.",
                duration: 6000,
            });
        }
    },

    /**
     * API rate limit warning
     */
    rateLimitWarning: () => {
        sonnerToast.warning("⚠️ Muitas requisições!", {
            description: "Aguarde alguns segundos antes de tentar novamente.",
            duration: 5000,
        });
    },

    /**
     * Session expired
     */
    sessionExpired: (onLogin?: () => void) => {
        sonnerToast.error("🔒 Sessão expirada", {
            description: "Faça login novamente para continuar.",
            duration: 8000,
            action: onLogin
                ? {
                    label: "Fazer login",
                    onClick: onLogin,
                }
                : undefined,
        });
    },

    /**
     * Automation status change
     */
    automationStatus: (active: boolean) => {
        if (active) {
            sonnerToast.success("🤖 Automação ativada!", {
                description: "Ofertas serão publicadas automaticamente.",
                duration: 4000,
            });
        } else {
            sonnerToast.info("⏸️ Automação pausada", {
                description: "Publicações automáticas desativadas.",
                duration: 4000,
            });
        }
    },

    /**
     * Copy to clipboard
     */
    copied: (what: string = "Texto") => {
        sonnerToast.success(`📋 ${what} copiado!`, {
            duration: 2000,
        });
    },

    /**
     * Delete confirmation
     */
    deleted: (what: string = "Item", count?: number) => {
        const message = count && count > 1 ? `${count} ${what}s excluídos` : `${what} excluído`;
        sonnerToast.success(`🗑️ ${message}!`, {
            duration: 3000,
        });
    },
};

// Default export for convenience
export default notify;
