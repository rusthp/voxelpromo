import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, CreditCard, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import api from "@/services/api";

interface Plan {
    id: string;
    displayName: string;
    priceDisplay: string;
    features: string[];
}

const PLANS_INFO: Record<string, Plan> = {
    trial: {
        id: 'trial',
        displayName: 'Teste Grátis',
        priceDisplay: 'Grátis por 7 dias',
        features: ['10 posts/dia', 'Telegram e WhatsApp']
    },
    pro: {
        id: 'pro',
        displayName: 'Profissional',
        priceDisplay: 'R$ 49,90/mês',
        features: ['100 posts/dia', 'Todos os canais', 'Analytics']
    },
    agency: {
        id: 'agency',
        displayName: 'Agência',
        priceDisplay: 'R$ 199,90/mês',
        features: ['Posts ilimitados', 'White-label', 'API']
    }
};

export default function Checkout() {
    const { planId } = useParams<{ planId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
    const [loading, setLoading] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

    const plan = planId ? PLANS_INFO[planId] : null;

    useEffect(() => {
        if (!plan) {
            toast({
                variant: "destructive",
                title: "Plano inválido",
                description: "O plano selecionado não existe."
            });
            navigate('/pricing');
        }
    }, [plan, navigate, toast]);

    const handleCreateCheckout = async () => {
        if (!planId) return;

        setLoading(true);
        try {
            // For trial, just activate directly (no payment needed)
            if (planId === 'trial') {
                toast({
                    title: "Teste ativado!",
                    description: "Seu período de teste de 7 dias foi iniciado."
                });
                navigate('/');
                return;
            }

            // Create Mercado Pago checkout
            const response = await api.post('/payments/create-checkout', { planId });
            const { initPoint, sandboxInitPoint } = response.data.data;

            // Use sandbox in development, production in prod
            const checkoutLink = process.env.NODE_ENV === 'production' ? initPoint : sandboxInitPoint;

            setCheckoutUrl(checkoutLink);

            toast({
                title: "Checkout criado!",
                description: "Redirecionando para o pagamento..."
            });

            // Redirect to Mercado Pago checkout
            setTimeout(() => {
                window.location.href = checkoutLink;
            }, 1500);

        } catch (error: any) {
            console.error('Checkout error:', error);
            toast({
                variant: "destructive",
                title: "Erro ao criar checkout",
                description: error.response?.data?.error || "Tente novamente mais tarde."
            });
        } finally {
            setLoading(false);
        }
    };

    if (!plan) return null;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Finalizar Assinatura</CardTitle>
                    <CardDescription>
                        Plano {plan.displayName} - {plan.priceDisplay}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Plan Summary */}
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                        <h3 className="font-semibold">Resumo do Plano</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            {plan.features.map((feature, idx) => (
                                <li key={idx}>• {feature}</li>
                            ))}
                        </ul>
                    </div>

                    {/* Payment Method Selection */}
                    {planId !== 'trial' && (
                        <div className="space-y-3">
                            <Label>Método de Pagamento</Label>
                            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'pix' | 'card')}>
                                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="pix" id="pix" />
                                    <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
                                        <QrCode className="h-5 w-5" />
                                        <div>
                                            <p className="font-medium">PIX</p>
                                            <p className="text-xs text-muted-foreground">Aprovação instantânea</p>
                                        </div>
                                    </Label>
                                </div>

                                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="card" id="card" />
                                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                                        <CreditCard className="h-5 w-5" />
                                        <div>
                                            <p className="font-medium">Cartão de Crédito</p>
                                            <p className="text-xs text-muted-foreground">Parcelamento disponível</p>
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Security Info */}
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-sm">
                        <p className="text-blue-900 dark:text-blue-100">
                            🔒 Pagamento seguro processado pelo Mercado Pago
                        </p>
                    </div>
                </CardContent>

                <CardFooter className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate('/pricing')}
                        disabled={loading}
                    >
                        Voltar
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleCreateCheckout}
                        disabled={loading || !!checkoutUrl}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : checkoutUrl ? (
                            'Redirecionando...'
                        ) : planId === 'trial' ? (
                            'Ativar Teste Grátis'
                        ) : (
                            'Confirmar Pagamento'
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
