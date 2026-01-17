import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Plan {
    id: string;
    name: string;
    displayName: string;
    price: number;
    priceDisplay: string;
    features: string[];
    recommended?: boolean;
    trialDays?: number;
}

const PLANS: Plan[] = [
    {
        id: 'trial',
        name: 'Gratis',
        displayName: 'Grátis',
        price: 0,
        priceDisplay: 'Sempre Grátis',
        features: [
            '10 posts por dia',
            '2 regras de automação',
            'Telegram e WhatsApp',
            'Suporte por email',
            'Acesso à comunidade'
        ],
        trialDays: undefined // It's a free tier now, not just a trial
    },
    {
        id: 'pro',
        name: 'Performance',
        displayName: 'Performance',
        price: 4990,
        priceDisplay: 'R$ 49,90/mês',
        features: [
            '200 posts por dia',
            '10 regras de automação',
            'Todos os canais disponíveis',
            'Filtros inteligentes (Whitelist/Blacklist)',
            'Analytics e relatórios',
            'Suporte prioritário (Email)'
        ],
        recommended: true
    },
    {
        id: 'agency',
        name: 'Plus',
        displayName: 'Plus',
        price: 9990,
        priceDisplay: 'R$ 99,90/mês',
        features: [
            'Posts ilimitados',
            'Regras de automação ilimitadas',
            'Todos os canais disponíveis',
            'Filtros Avançados',
            'API de integração',
            'Suporte dedicado (WhatsApp)',
            'Consultoria mensal'
        ]
    }
];

export default function Pricing() {
    const navigate = useNavigate();

    const handleSelectPlan = (planId: string) => {
        if (planId === 'trial') {
            // Trial is free, just activate it directly
            navigate('/checkout/trial');
        } else {
            navigate(`/checkout/${planId}`);
        }
    };

    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Escolha seu Plano</h1>
                    <p className="text-xl text-muted-foreground">
                        Comece grátis e aumente sua escala conforme seu negócio cresce
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-8">
                    {PLANS.map((plan) => (
                        <Card
                            key={plan.id}
                            className={`relative flex flex-col ${plan.recommended
                                ? 'border-primary shadow-lg scale-105'
                                : 'border-border'
                                }`}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                                        Mais Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                                <CardDescription>
                                    <div className="mt-4">
                                        <span className="text-4xl font-bold text-foreground">
                                            {plan.price === 0 ? 'Grátis' : plan.priceDisplay.split('/')[0]}
                                        </span>
                                        {plan.price > 0 && (
                                            <span className="text-muted-foreground ml-2">/mês</span>
                                        )}
                                    </div>
                                    {plan.trialDays && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Sem cartão de crédito necessário
                                        </p>
                                    )}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1">
                                <ul className="space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={plan.recommended ? 'default' : 'outline'}
                                    size="lg"
                                    onClick={() => handleSelectPlan(plan.id)}
                                >
                                    {plan.trialDays ? 'Começar Teste Grátis' : 'Assinar Agora'}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* FAQ or additional info */}
                <div className="mt-16 text-center text-sm text-muted-foreground">
                    <p>Todos os planos incluem acesso completo à plataforma.</p>
                    <p className="mt-2">Cancele a qualquer momento. Sem taxas escondidas.</p>
                </div>
            </div>
        </div>
    );
}
