import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import api from '@/services/api';

export type NicheType = 'tech' | 'fashion' | 'health' | 'home' | 'sports' | 'games' | 'general';

interface NicheOption {
    id: NicheType;
    emoji: string;
    label: string;
    description: string;
}

const NICHE_OPTIONS: NicheOption[] = [
    { id: 'tech', emoji: '🖥️', label: 'Tecnologia', description: 'Eletrônicos, gadgets, computadores' },
    { id: 'fashion', emoji: '👗', label: 'Moda & Acessórios', description: 'Roupas, sapatos, bolsas' },
    { id: 'health', emoji: '💊', label: 'Saúde & Beleza', description: 'Cosméticos, suplementos, bem-estar' },
    { id: 'home', emoji: '🏠', label: 'Casa & Decoração', description: 'Móveis, eletrodomésticos, decoração' },
    { id: 'sports', emoji: '⚽', label: 'Esportes', description: 'Equipamentos, roupas esportivas' },
    { id: 'games', emoji: '🎮', label: 'Games & Entretenimento', description: 'Jogos, consoles, streaming' },
    { id: 'general', emoji: '📦', label: 'Geral', description: 'Todos os nichos, variedade' },
];

interface NicheSelectionModalProps {
    open: boolean;
    onNicheSelected: (niche: NicheType) => void;
}

export function NicheSelectionModal({ open, onNicheSelected }: NicheSelectionModalProps) {
    const [selectedNiche, setSelectedNiche] = useState<NicheType | null>(null);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selectedNiche) return;

        setLoading(true);
        try {
            await api.put('/profile', {
                preferences: { niche: selectedNiche }
            });
            onNicheSelected(selectedNiche);
        } catch (error) {
            console.error('Error saving niche:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-xl">🎯 Qual é o seu nicho?</DialogTitle>
                    <DialogDescription>
                        Isso nos ajuda a mostrar ofertas mais relevantes para você
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-2 my-4">
                    {NICHE_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedNiche(option.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${selectedNiche === option.id
                                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                        >
                            <span className="text-2xl">{option.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{option.label}</p>
                                <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <Button
                    onClick={handleConfirm}
                    disabled={!selectedNiche || loading}
                    className="w-full"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        'Continuar'
                    )}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
