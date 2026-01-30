import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ArrowRight, Zap, MousePointerClick, Settings } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// Reuse Niche Options but with updated backend mapping
export type NicheType = 'tech' | 'fashion' | 'beauty' | 'home' | 'games' | 'kids' | 'diversified';

interface NicheOption {
    id: NicheType;
    emoji: string;
    label: string;
    description: string;
}

const NICHE_OPTIONS: NicheOption[] = [
    { id: 'diversified', emoji: '🎲', label: 'Diversificado', description: 'Mix de ofertas variadas e tendências gerais' },
    { id: 'tech', emoji: '🖥️', label: 'Tecnologia', description: 'Smartphones, gadgets e computadores' },
    { id: 'games', emoji: '🎮', label: 'Games', description: 'Consoles, jogos e acessórios gamer' },
    { id: 'fashion', emoji: '👗', label: 'Moda', description: 'Roupas, calçados e acessórios' },
    { id: 'home', emoji: '🏠', label: 'Casa & Cozinha', description: 'Eletroportáteis e decoração' },
    { id: 'beauty', emoji: '💄', label: 'Beleza', description: 'Maquiagem, skincare e perfumes' },
    { id: 'kids', emoji: '🧸', label: 'Infantil', description: 'Brinquedos, roupas de bebê e jogos' },
];

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { refreshProfile } = useAuth();
    const [step, setStep] = useState(0);
    const [selectedNiche, setSelectedNiche] = useState<NicheType | null>(null);
    const [loading, setLoading] = useState(false);

    const handleNicheSelect = async (niche: NicheType) => {
        setSelectedNiche(niche);
    };

    const saveAndContinue = async () => {
        if (!selectedNiche) return;
        setLoading(true);
        try {
            // Determines backend sync via updated ProfileController
            await api.put('/profile', {
                preferences: { niche: selectedNiche }
            });
            await refreshProfile();
            setStep(prev => prev + 1);
        } catch (error) {
            console.error('Failed to save niche', error);
        } finally {
            setLoading(false);
        }
    };

    const finishOnboarding = () => {
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* Progress Steps */}
                <div className="flex justify-center mb-8 gap-2">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`h-2 w-16 rounded-full transition-colors duration-300 ${i <= step ? 'bg-primary' : 'bg-muted'
                                }`}
                        />
                    ))}
                </div>

                <div>
                    {/* STEP 0: WELCOME */}
                    {step === 0 && (
                        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-primary/10 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                                <Zap className="w-10 h-10 text-primary" />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight">Bem-vindo ao VoxelPromo!</h1>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Vamos configurar seu piloto automático de ofertas em menos de 1 minuto.
                                Sem configurações complicadas agora.
                            </p>
                            <div className="pt-8">
                                <Button size="lg" onClick={() => setStep(1)} className="text-lg px-8 h-12">
                                    Começar <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: NICHE SELECTION */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold mb-2">Qual é o seu foco principal?</h2>
                                <p className="text-muted-foreground">Escolha um nicho para começarmos. Você pode mudar isso depois.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {NICHE_OPTIONS.map((option) => (
                                    <Card
                                        key={option.id}
                                        className={`cursor-pointer transition-all hover:scale-105 border-2 ${selectedNiche === option.id
                                                ? 'border-primary bg-primary/5 shadow-lg'
                                                : 'border-transparent hover:border-primary/50'
                                            }`}
                                        onClick={() => handleNicheSelect(option.id)}
                                    >
                                        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                            <span className="text-4xl mb-2">{option.emoji}</span>
                                            <h3 className="font-semibold text-lg">{option.label}</h3>
                                            <p className="text-sm text-muted-foreground">{option.description}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="flex justify-end pt-6">
                                <Button
                                    size="lg"
                                    onClick={saveAndContinue}
                                    disabled={!selectedNiche || loading}
                                    className="w-full md:w-auto"
                                >
                                    {loading ? 'Salvando...' : 'Próximo Passo'}
                                    {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CONNECT (Simple) */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold mb-2">Conecte suas Redes</h2>
                                <p className="text-muted-foreground">
                                    Para postar automaticamente, precisamos conectar suas contas.
                                    Você pode fazer isso agora ou depois no Painel.
                                </p>
                            </div>

                            <div className="grid gap-4 max-w-2xl mx-auto">
                                <div className="flex items-center p-4 border rounded-lg bg-card">
                                    <div className="p-2 bg-blue-100 rounded text-blue-600 mr-4">
                                        <Settings className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">Configurar Integrações</h3>
                                        <p className="text-sm text-muted-foreground">Shopee, Amazon, Instagram e Telegram</p>
                                    </div>
                                    <Button variant="outline" onClick={() => window.open('/settings', '_blank')}>
                                        Abrir Configurações
                                    </Button>
                                </div>

                                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md text-sm border-l-4 border-yellow-400">
                                    💡 <strong>Dica:</strong> Se você ainda não tem as chaves de API, não se preocupe!
                                    Pode pular esta etapa e configurar quando estiver pronto.
                                </div>
                            </div>

                            <div className="flex justify-center gap-4 pt-4">
                                <Button variant="ghost" onClick={() => setStep(3)}>
                                    Fazer isso depois
                                </Button>
                                <Button onClick={() => setStep(3)}>
                                    Já configurei, continuar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {step === 3 && (
                        <div className="text-center space-y-8 py-10 animate-in zoom-in duration-500">
                            <div className="bg-green-100 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                                <Check className="w-12 h-12 text-green-600" />
                            </div>

                            <div>
                                <h2 className="text-3xl font-bold mb-4">Tudo Pronto! 🚀</h2>
                                <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                                    Seu VoxelPromo está configurado para o nicho <strong>{NICHE_OPTIONS.find(n => n.id === selectedNiche)?.label}</strong>.
                                    <br />
                                    As ofertas começarão a aparecer no seu painel em breve.
                                </p>
                            </div>

                            <div className="pt-6">
                                <Button size="lg" onClick={finishOnboarding} className="h-14 px-8 text-lg shadow-xl hover:shadow-2xl transition-all">
                                    <MousePointerClick className="mr-2" />
                                    Ir para o Dashboard
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
