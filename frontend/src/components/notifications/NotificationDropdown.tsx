import { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Notification {
    id: string;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    timestamp: Date;
    read: boolean;
}

// Simple notification store using localStorage
const STORAGE_KEY = "voxelpromo_notifications";

export const notificationStore = {
    get: (): Notification[] => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return [];
            const notifications = JSON.parse(stored);
            return notifications.map((n: any) => ({
                ...n,
                timestamp: new Date(n.timestamp),
            }));
        } catch {
            return [];
        }
    },

    add: (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
        const notifications = notificationStore.get();
        const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: new Date(),
            read: false,
        };

        // Keep only last 50 notifications
        const updated = [newNotification, ...notifications].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent("notification-added", { detail: newNotification }));

        return newNotification;
    },

    markAsRead: (id: string) => {
        const notifications = notificationStore.get();
        const updated = notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("notifications-updated"));
    },

    markAllAsRead: () => {
        const notifications = notificationStore.get();
        const updated = notifications.map(n => ({ ...n, read: true }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("notifications-updated"));
    },

    clear: () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        window.dispatchEvent(new CustomEvent("notifications-updated"));
    },

    getUnreadCount: (): number => {
        return notificationStore.get().filter(n => !n.read).length;
    },
};

// Helper to add notifications from anywhere
export const addNotification = notificationStore.add;

interface NotificationDropdownProps {
    className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshNotifications = () => {
        setNotifications(notificationStore.get());
        setUnreadCount(notificationStore.getUnreadCount());
    };

    useEffect(() => {
        refreshNotifications();

        // Listen for notification updates
        const handleUpdate = () => refreshNotifications();
        window.addEventListener("notification-added", handleUpdate);
        window.addEventListener("notifications-updated", handleUpdate);

        return () => {
            window.removeEventListener("notification-added", handleUpdate);
            window.removeEventListener("notifications-updated", handleUpdate);
        };
    }, []);

    const getIcon = (type: Notification["type"]) => {
        switch (type) {
            case "success":
                return <CheckCircle className="w-4 h-4 text-success" />;
            case "error":
                return <AlertCircle className="w-4 h-4 text-destructive" />;
            case "warning":
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case "info":
            default:
                return <Info className="w-4 h-4 text-info" />;
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "agora";
        if (minutes < 60) return `${minutes}min`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    };

    const handleMarkAsRead = (id: string) => {
        notificationStore.markAsRead(id);
    };

    const handleMarkAllAsRead = () => {
        notificationStore.markAllAsRead();
    };

    const handleClear = () => {
        notificationStore.clear();
    };

    return (
        <div className={cn("relative", className)}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-secondary transition-colors"
            >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center animate-pulse-glow">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-12 w-80 max-h-[70vh] glass rounded-xl shadow-xl z-50 overflow-hidden animate-slide-up">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-semibold text-foreground">Notificações</h3>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <>
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Marcar como lidas
                                        </button>
                                        <button
                                            onClick={handleClear}
                                            className="p-1 hover:bg-secondary rounded"
                                            title="Limpar tudo"
                                        >
                                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-secondary rounded"
                                >
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[50vh] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Nenhuma notificação</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "p-3 border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer",
                                            !notification.read && "bg-primary/5"
                                        )}
                                        onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {getIcon(notification.type)}
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "text-sm text-foreground",
                                                    !notification.read && "font-medium"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                {notification.message && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    {formatTime(notification.timestamp)}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
