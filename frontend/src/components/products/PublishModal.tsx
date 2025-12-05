import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    offerId: string | null;
    onSuccess: () => void;
}

const channels = [
    { id: "telegram", label: "Telegram" },
    { id: "twitter", label: "X (Twitter)" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "discord", label: "Discord" },
];

export function PublishModal({ isOpen, onClose, offerId, onSuccess }: PublishModalProps) {
    const [selectedChannels, setSelectedChannels] = useState<string[]>(["telegram"]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState("");

    const handleToggleChannel = (channelId: string) => {
        setSelectedChannels(prev =>
            prev.includes(channelId)
                ? prev.filter(id => id !== channelId)
                : [...prev, channelId]
        );
    };

    const handleGenerateAI = async () => {
        if (!offerId) return;

        try {
            setGenerating(true);
            const response = await api.post(`/offers/${offerId}/generate-post`, { tone: "viral" });
            if (response.data && response.data.post) {
                setMessage(response.data.post);
                toast.success("Texto gerado com sucesso!");
            }
        } catch (error) {
            console.error("Error generating AI post:", error);
            toast.error("Erro ao gerar texto com IA.");
        } finally {
            setGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!offerId) return;

        try {
            setLoading(true);
            await api.post(`/offers/${offerId}/post`, {
                channels: selectedChannels,
                customMessage: message
            });
            toast.success("Oferta publicada com sucesso!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error publishing offer:", error);
            toast.error("Erro ao publicar oferta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Publicar Oferta</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Mensagem da Publicação</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerateAI}
                                disabled={generating}
                                className="text-primary hover:text-primary/80 h-8 px-2"
                            >
                                {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                Gerar com IA
                            </Button>
                        </div>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite ou gere o texto da oferta..."
                            className="min-h-[150px] font-mono text-sm"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Canais de Destino</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {channels.map((channel) => (
                                <div key={channel.id} className="flex items-center space-x-2 border p-2 rounded-md hover:bg-secondary/50 transition-colors">
                                    <Checkbox
                                        id={channel.id}
                                        checked={selectedChannels.includes(channel.id)}
                                        onCheckedChange={() => handleToggleChannel(channel.id)}
                                    />
                                    <Label htmlFor={channel.id} className="cursor-pointer flex-1">
                                        {channel.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handlePublish} disabled={loading || selectedChannels.length === 0} className="gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Publicar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
