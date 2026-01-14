import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { Loader2, Check, Shield, ArrowLeft, CreditCard, QrCode, Barcode, Tag, Sparkles, Copy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import api from "@/services/api";

// Initialize Mercado Pago SDK
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

if (MP_PUBLIC_KEY) {
    initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
}

interface Plan {
    id: string;
    displayName: string;
    description: string;
    price: number;
    priceDisplay: string;
    billingCycle: string;
    features: string[];
    trialDays?: number;
}

const PLANS_INFO: Record<string, Plan> = {
    trial: {
        id: 'trial',
        displayName: 'Teste Grátis',
        description: 'Experimente o VoxelPromo',
        price: 0,
        priceDisplay: 'R$ 0,00',
        billingCycle: '7 dias grátis',
        features: ['10 posts/dia', 'Telegram e WhatsApp', 'Suporte por email'],
        trialDays: 7
    },
    pro: {
        id: 'pro',
        displayName: 'Pro',
        description: 'Para afiliados profissionais',
        price: 4990,
        priceDisplay: 'R$ 49,90',
        billingCycle: 'por mês',
        features: ['100 posts/dia', 'Todos os canais', 'Analytics', 'Suporte prioritário'],
        trialDays: 7
    },
    agency: {
        id: 'agency',
        displayName: 'Agência',
        description: 'Para times e empresas',
        price: 19990,
        priceDisplay: 'R$ 199,90',
        billingCycle: 'por mês',
        features: ['Posts ilimitados', 'White-label', 'API', 'Suporte dedicado'],
        trialDays: 7
    }
};

type PaymentMethod = 'card' | 'pix' | 'boleto';
type PaymentStep = 'form' | 'processing' | 'awaiting' | 'success' | 'error';

export default function Checkout() {
    const { planId } = useParams<{ planId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [step, setStep] = useState<PaymentStep>('form');
    const [promoCode, setPromoCode] = useState('');
    const [promoApplied, setPromoApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [showPromoInput, setShowPromoInput] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Pix/Boleto data
    const [pixCode, setPixCode] = useState<string | null>(null);
    const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
    const [pixExpiration, setPixExpiration] = useState<Date | null>(null);
    const [pixTimeLeft, setPixTimeLeft] = useState<number>(0);
    const [boletoUrl, setBoletoUrl] = useState<string | null>(null);
    const [boletoBarcode, setBoletoBarcode] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Pix form
    const [pixEmail, setPixEmail] = useState('');
    const [pixCpf, setPixCpf] = useState('');

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

    useEffect(() => {
        if (!MP_PUBLIC_KEY && planId !== 'trial') {
            console.error('VITE_MP_PUBLIC_KEY is not set! Configure in frontend/.env and rebuild.');
            setErrorMessage('Sistema de pagamento não configurado. Entre em contato com o suporte.');
        }
    }, [planId]);

    // Pix countdown timer
    useEffect(() => {
        if (step === 'awaiting' && pixExpiration) {
            const updateTimer = () => {
                const now = new Date();
                const diff = Math.max(0, Math.floor((pixExpiration.getTime() - now.getTime()) / 1000));
                setPixTimeLeft(diff);

                if (diff <= 0) {
                    // Timer expired
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                    }
                    setStep('error');
                    setErrorMessage('Tempo expirado! Gere um novo código Pix.');
                    setPixCode(null);
                    setPixQrCodeBase64(null);
                    setPixExpiration(null);
                    toast({
                        variant: "destructive",
                        title: "Pix expirado",
                        description: "Gere um novo código para continuar"
                    });
                }
            };

            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        }
    }, [step, pixExpiration, toast]);

    // Calculate prices
    const subtotal = plan?.price || 0;
    const discountAmount = discount;
    const totalAfterTrial = subtotal - discountAmount;
    const totalDueToday = plan?.trialDays ? 0 : totalAfterTrial;

    // Apply promo code
    const handleApplyPromo = () => {
        if (promoCode.toUpperCase() === 'VOXEL10') {
            setDiscount(Math.round(subtotal * 0.1));
            setPromoApplied(true);
            toast({ title: "Cupom aplicado!", description: "10% de desconto" });
        } else {
            toast({ variant: "destructive", title: "Cupom inválido" });
        }
    };

    // Handle CardPayment submission
    const handleCardPaymentSubmit = useCallback(async (formData: any) => {
        setStep('processing');
        setErrorMessage(null);

        try {
            const response = await api.post('/payments/process-subscription', {
                planId,
                token: formData.token,
                paymentMethodId: formData.payment_method_id,
                issuerId: formData.issuer_id,
                installments: formData.installments,
                payerEmail: formData.payer?.email,
                payerIdentification: formData.payer?.identification,
            });

            if (response.data.success) {
                setStep('success');
                toast({
                    title: "Assinatura ativada!",
                    description: "Bem-vindo ao VoxelPromo."
                });
                setTimeout(() => navigate('/'), 2500);
            } else {
                throw new Error(response.data.error || 'Erro ao processar');
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            setStep('error');
            setErrorMessage(error.response?.data?.error || error.message || 'Erro ao processar pagamento.');
        }
    }, [planId, navigate, toast]);

    // Handle Pix payment
    const handlePixPayment = async () => {
        if (!pixEmail || !pixCpf) {
            toast({ variant: "destructive", title: "Preencha todos os campos" });
            return;
        }

        setStep('processing');
        setErrorMessage(null);

        try {
            const response = await api.post('/payments/create-pix', {
                planId,
                payerEmail: pixEmail,
                payerCpf: pixCpf.replace(/\D/g, ''),
                amount: totalAfterTrial / 100,
            });

            if (response.data.success) {
                setPixCode(response.data.qrCode || response.data.pixCopiaECola);
                setPixQrCodeBase64(response.data.qrCodeBase64);
                // Set expiration (5 minutes from now, or use response if available)
                const expiration = response.data.expirationDate
                    ? new Date(response.data.expirationDate)
                    : new Date(Date.now() + 5 * 60 * 1000);
                setPixExpiration(expiration);
                setStep('awaiting');
                toast({ title: "Pix gerado!", description: "Você tem 5 minutos para pagar" });
            } else {
                throw new Error(response.data.error || 'Erro ao gerar Pix');
            }
        } catch (error: any) {
            console.error('Pix error:', error);
            setStep('error');
            setErrorMessage(error.response?.data?.error || 'Erro ao gerar código Pix. Tente novamente.');
        }
    };

    // Handle Boleto payment
    const handleBoletoPayment = async () => {
        if (!pixEmail || !pixCpf) {
            toast({ variant: "destructive", title: "Preencha todos os campos" });
            return;
        }

        setStep('processing');
        setErrorMessage(null);

        try {
            const response = await api.post('/payments/create-boleto', {
                planId,
                payerEmail: pixEmail,
                payerCpf: pixCpf.replace(/\D/g, ''),
                amount: totalAfterTrial / 100,
            });

            if (response.data.success) {
                setBoletoUrl(response.data.boletoUrl);
                setBoletoBarcode(response.data.barcode);
                setStep('awaiting');
                toast({ title: "Boleto gerado!", description: "Pague até a data de vencimento" });
            } else {
                throw new Error(response.data.error || 'Erro ao gerar Boleto');
            }
        } catch (error: any) {
            console.error('Boleto error:', error);
            setStep('error');
            setErrorMessage(error.response?.data?.error || 'Erro ao gerar boleto. Tente novamente.');
        }
    };

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado!", description: "Código copiado para a área de transferência" });
    };

    // Handle trial activation
    const handleActivateTrial = async () => {
        setStep('processing');
        try {
            await api.post('/payments/process-subscription', { planId: 'trial', token: 'trial' });
            toast({ title: "Teste ativado!", description: "7 dias grátis" });
            navigate('/');
        } catch {
            toast({ variant: "destructive", title: "Erro ao ativar teste" });
            setStep('form');
        }
    };

    // Format CPF as user types
    const formatCpf = (value: string) => {
        const nums = value.replace(/\D/g, '').slice(0, 11);
        if (nums.length <= 3) return nums;
        if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
        if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
        return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
    };

    if (!plan) return null;

    // Trial plan - simplified VoxelPromo style
    if (planId === 'trial') {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Teste Grátis</h1>
                    <p className="text-zinc-400 mb-6">7 dias para explorar todas as funcionalidades</p>
                    <Button
                        className="w-full h-12 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-semibold rounded-xl border-0"
                        onClick={handleActivateTrial}
                        disabled={step === 'processing'}
                    >
                        {step === 'processing' ? <Loader2 className="animate-spin mr-2" /> : null}
                        Iniciar Teste Grátis
                    </Button>
                    <button
                        className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        onClick={() => navigate('/pricing')}
                    >
                        Voltar aos planos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Mobile/Desktop Layout */}
            <div className="lg:flex lg:min-h-screen">

                {/* Left Column - Plan Summary */}
                <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 lg:w-[45%] p-6 lg:p-12 border-r border-zinc-800">
                    <button
                        onClick={() => navigate('/pricing')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-cyan-400 mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">VoxelPromo</span>
                    </button>

                    <div className="lg:max-w-md lg:ml-auto">
                        <div className="mb-2 text-zinc-500 text-sm font-medium">
                            Assinar {plan.displayName}
                        </div>

                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                                {plan.trialDays} dias grátis
                            </span>
                        </h1>

                        <p className="text-zinc-400 mb-8">
                            Depois, {plan.priceDisplay} {plan.billingCycle}
                        </p>

                        {/* Plan Details */}
                        <div className="space-y-4 py-6 border-t border-zinc-800">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium text-white">{plan.displayName}</div>
                                    <div className="text-sm text-zinc-500">{plan.description}</div>
                                </div>
                                <div className="text-right">
                                    <span className="font-medium text-cyan-400">{plan.trialDays} dias grátis</span>
                                </div>
                            </div>
                        </div>

                        {/* Subtotal */}
                        <div className="py-4 border-t border-zinc-800 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Subtotal</span>
                                <span className="text-zinc-300">{plan.priceDisplay}</span>
                            </div>

                            {/* Promo Code */}
                            {!promoApplied ? (
                                <button
                                    onClick={() => setShowPromoInput(!showPromoInput)}
                                    className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    <Tag className="w-4 h-4" />
                                    Adicionar código promocional
                                </button>
                            ) : (
                                <div className="flex justify-between text-sm text-emerald-400">
                                    <span>Desconto (VOXEL10)</span>
                                    <span>-R$ {(discountAmount / 100).toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}

                            {showPromoInput && !promoApplied && (
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        placeholder="Código"
                                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-9"
                                    />
                                    <Button
                                        onClick={handleApplyPromo}
                                        variant="outline"
                                        className="bg-transparent border-zinc-700 text-cyan-400 hover:bg-zinc-800 h-9"
                                    >
                                        Aplicar
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Total */}
                        <div className="py-4 border-t border-zinc-800 space-y-2">
                            <div className="flex justify-between text-sm text-zinc-500">
                                <span>Total após período de avaliação</span>
                                <span>R$ {((totalAfterTrial) / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg">
                                <span className="text-white">Total devido hoje</span>
                                <span className="text-emerald-400">R$ {(totalDueToday / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Payment Form */}
                <div className="bg-zinc-950 lg:w-[55%] p-6 lg:p-12 flex items-start justify-center">
                    <div className="w-full max-w-md">

                        {step === 'form' && (
                            <>
                                <h2 className="text-xl font-semibold text-white mb-6">
                                    Inserir detalhes de pagamento
                                </h2>

                                {/* Payment Methods Tabs */}
                                <div className="flex gap-2 mb-6">
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${paymentMethod === 'card'
                                            ? 'bg-zinc-800 border-2 border-cyan-500 text-cyan-400'
                                            : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                                            }`}
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        Cartão
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${paymentMethod === 'pix'
                                            ? 'bg-zinc-800 border-2 border-emerald-500 text-emerald-400'
                                            : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                                            }`}
                                    >
                                        <QrCode className="w-4 h-4" />
                                        Pix
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('boleto')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${paymentMethod === 'boleto'
                                            ? 'bg-zinc-800 border-2 border-orange-500 text-orange-400'
                                            : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                                            }`}
                                    >
                                        <Barcode className="w-4 h-4" />
                                        Boleto
                                    </button>
                                </div>

                                {/* Billing Type Warning */}
                                {paymentMethod === 'card' && (
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
                                        <div className="flex items-start gap-3">
                                            <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium text-amber-400">Assinatura Recorrente</p>
                                                <p className="text-xs text-zinc-400 mt-1">
                                                    Você será cobrado automaticamente R$ {((plan?.price || 0) / 100).toFixed(2).replace('.', ',')} por mês.
                                                    Cancele quando quiser, sem multa.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(paymentMethod === 'pix' || paymentMethod === 'boleto') && (
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-4">
                                        <div className="flex items-start gap-3">
                                            <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-400">Pagamento Único (30 dias)</p>
                                                <p className="text-xs text-zinc-400 mt-1">
                                                    Seu acesso será liberado por 30 dias após o pagamento.
                                                    Renove quando quiser via Pix ou Boleto.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Card Payment Form */}
                                {paymentMethod === 'card' && MP_PUBLIC_KEY && (
                                    <div className="border border-zinc-800 rounded-xl overflow-hidden">
                                        <CardPayment
                                            initialization={{ amount: totalAfterTrial / 100 }}
                                            customization={{
                                                paymentMethods: { maxInstallments: 1 },
                                                visual: {
                                                    style: { theme: 'dark', customVariables: { formBackgroundColor: '#18181b', baseColor: '#06b6d4' } },
                                                    hidePaymentButton: false,
                                                    texts: { formSubmit: 'Iniciar teste grátis' }
                                                },
                                            }}
                                            onSubmit={handleCardPaymentSubmit}
                                            onReady={() => console.log('CardPayment ready')}
                                            onError={(err) => console.error('CardPayment error:', err)}
                                        />
                                    </div>
                                )}

                                {/* Pix Payment Form */}
                                {paymentMethod === 'pix' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm mb-1">
                                                <QrCode className="w-4 h-4" />
                                                Pagamento instantâneo
                                            </div>
                                            <p className="text-sm text-zinc-400">
                                                Pague com Pix e seu acesso é liberado na hora.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm text-zinc-400 mb-1 block">E-mail</label>
                                                <Input
                                                    type="email"
                                                    value={pixEmail}
                                                    onChange={(e) => setPixEmail(e.target.value)}
                                                    placeholder="seu@email.com"
                                                    className="bg-zinc-800 border-zinc-700 text-white h-12"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-zinc-400 mb-1 block">CPF</label>
                                                <Input
                                                    value={pixCpf}
                                                    onChange={(e) => setPixCpf(formatCpf(e.target.value))}
                                                    placeholder="000.000.000-00"
                                                    className="bg-zinc-800 border-zinc-700 text-white h-12"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handlePixPayment}
                                            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 font-semibold rounded-xl border-0"
                                        >
                                            <QrCode className="w-4 h-4 mr-2" />
                                            Gerar código Pix
                                        </Button>
                                    </div>
                                )}

                                {/* Boleto Payment Form */}
                                {paymentMethod === 'boleto' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                                            <div className="flex items-center gap-2 text-orange-400 font-medium text-sm mb-1">
                                                <Clock className="w-4 h-4" />
                                                Prazo de compensação
                                            </div>
                                            <p className="text-sm text-zinc-400">
                                                O boleto pode levar até 3 dias úteis para ser compensado.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm text-zinc-400 mb-1 block">E-mail</label>
                                                <Input
                                                    type="email"
                                                    value={pixEmail}
                                                    onChange={(e) => setPixEmail(e.target.value)}
                                                    placeholder="seu@email.com"
                                                    className="bg-zinc-800 border-zinc-700 text-white h-12"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-zinc-400 mb-1 block">CPF</label>
                                                <Input
                                                    value={pixCpf}
                                                    onChange={(e) => setPixCpf(formatCpf(e.target.value))}
                                                    placeholder="000.000.000-00"
                                                    className="bg-zinc-800 border-zinc-700 text-white h-12"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleBoletoPayment}
                                            className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-semibold rounded-xl border-0"
                                        >
                                            <Barcode className="w-4 h-4 mr-2" />
                                            Gerar boleto
                                        </Button>
                                    </div>
                                )}

                                {/* Config Error */}
                                {!MP_PUBLIC_KEY && paymentMethod === 'card' && (
                                    <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                        {errorMessage || 'Configuração de pagamento não disponível.'}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-center gap-4 mt-6 text-xs text-zinc-600">
                                    <span>Powered by</span>
                                    <span className="font-semibold text-zinc-400">mercado pago</span>
                                    <span className="text-zinc-700">|</span>
                                    <a href="/terms" className="hover:text-zinc-400">Termos</a>
                                    <a href="/privacy" className="hover:text-zinc-400">Privacidade</a>
                                </div>
                            </>
                        )}

                        {/* Awaiting Payment (Pix/Boleto) */}
                        {step === 'awaiting' && (
                            <div className="space-y-6">
                                {pixCode && (
                                    <>
                                        <div className="relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl overflow-hidden">
                                            {/* Background Gradient Effect */}
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 animate-gradient-x opacity-70"></div>

                                            <div className="text-center relative z-10">
                                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] animate-pulse-slow">
                                                    <QrCode className="w-10 h-10 text-emerald-400" />
                                                </div>

                                                <h2 className="text-2xl font-bold text-white mb-2">Pagamento via Pix</h2>
                                                <p className="text-zinc-400">Escaneie o QR Code abaixo para liberar seu acesso instantaneamente.</p>

                                                {/* Countdown Timer - Modern */}
                                                <div className="mt-6 inline-flex flex-col items-center">
                                                    <span className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Expira em</span>
                                                    <div className={`flex items-center gap-3 px-6 py-3 rounded-full border backdrop-blur-sm transition-colors duration-500 ${pixTimeLeft <= 60
                                                        ? 'bg-red-500/10 border-red-500/50 text-red-400'
                                                        : 'bg-zinc-800/80 border-cyan-500/30 text-cyan-400'
                                                        }`}>
                                                        <Clock className={`w-5 h-5 ${pixTimeLeft <= 60 ? 'animate-pulse' : ''}`} />
                                                        <span className="font-mono text-2xl font-bold tracking-widest">
                                                            {Math.floor(pixTimeLeft / 60).toString().padStart(2, '0')}:
                                                            {(pixTimeLeft % 60).toString().padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* QR Code Card */}
                                            <div className="mt-8 bg-white p-4 rounded-xl shadow-2xl mx-auto w-fit relative group">
                                                <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                                                <div className="relative bg-white p-2 rounded-lg">
                                                    {pixQrCodeBase64 ? (
                                                        <img
                                                            src={`data:image/png;base64,${pixQrCodeBase64}`}
                                                            alt="QR Code Pix"
                                                            className="w-56 h-56 mix-blend-multiply"
                                                        />
                                                    ) : (
                                                        <div className="w-56 h-56 bg-zinc-100 rounded flex items-center justify-center">
                                                            <Loader2 className="w-12 h-12 text-zinc-300 animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Pix Copia e Cola - Enhanced */}
                                            <div className="mt-8 space-y-3 max-w-md mx-auto">
                                                <div className="flex items-center justify-between text-sm">
                                                    <label className="text-zinc-400 font-medium">Pix Copia e Cola</label>
                                                    <span className="text-emerald-500 text-xs font-semibold animate-pulse">Aguardando pagamento...</span>
                                                </div>
                                                <div className="relative group">
                                                    <Input
                                                        readOnly
                                                        value={pixCode}
                                                        className="bg-black/40 border-zinc-700 text-zinc-300 font-mono text-xs h-12 pr-14 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                                    />
                                                    <div className="absolute right-1 top-1 bottom-1">
                                                        <Button
                                                            onClick={() => {
                                                                copyToClipboard(pixCode);
                                                                toast({ title: "Copiado!", description: "Código Pix copiado para a área de transferência." });
                                                            }}
                                                            variant="secondary"
                                                            className="h-full bg-zinc-800 hover:bg-zinc-700 text-white border-none shadow-none rounded-md px-4"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-center text-xs text-zinc-500 py-2">
                                                    Após o pagamento, a liberação é automática em poucos segundos.
                                                </p>
                                            </div>

                                            <div className="mt-6 pt-6 border-t border-zinc-800/50 text-center">
                                                <Button onClick={() => setStep('form')} variant="link" className="text-zinc-500 hover:text-white transition-colors">
                                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                                    Escolher outra forma de pagamento
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {boletoUrl && (
                                    <>
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                                                <Barcode className="w-8 h-8 text-orange-400" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-white">Boleto gerado!</h2>
                                            <p className="text-zinc-400 text-sm mt-1">Pague até a data de vencimento</p>
                                        </div>

                                        {boletoBarcode && (
                                            <div className="space-y-2">
                                                <label className="text-sm text-zinc-400">Código de barras</label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        readOnly
                                                        value={boletoBarcode}
                                                        className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
                                                    />
                                                    <Button onClick={() => copyToClipboard(boletoBarcode)} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            onClick={() => window.open(boletoUrl, '_blank')}
                                            className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 font-semibold rounded-xl"
                                        >
                                            Visualizar boleto
                                        </Button>

                                        <Button onClick={() => setStep('form')} variant="ghost" className="w-full text-zinc-400">
                                            Escolher outra forma de pagamento
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Processing State */}
                        {step === 'processing' && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                                    <div className="absolute inset-0 rounded-full animate-ping bg-cyan-500/20" />
                                </div>
                                <p className="text-lg font-medium text-white mt-6">Processando...</p>
                                <p className="text-sm text-zinc-500">Não feche esta página</p>
                            </div>
                        )}

                        {/* Success State */}
                        {step === 'success' && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4">
                                    <Check className="w-8 h-8 text-white" />
                                </div>
                                <p className="text-xl font-semibold text-white">Assinatura ativada!</p>
                                <p className="text-sm text-zinc-500 mt-2">Redirecionando...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {step === 'error' && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4 border border-red-500/30">
                                    <Shield className="w-8 h-8 text-red-400" />
                                </div>
                                <p className="text-xl font-semibold text-white">Erro no pagamento</p>
                                <p className="text-sm text-zinc-500 mt-2 text-center max-w-xs">{errorMessage}</p>
                                <Button
                                    onClick={() => setStep('form')}
                                    className="mt-6 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 border-0"
                                >
                                    Tentar novamente
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
