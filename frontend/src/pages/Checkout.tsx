import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { initMercadoPago } from '@mercadopago/sdk-react';
import { Loader2, Check, Shield, ArrowLeft, CreditCard, QrCode, Barcode, Tag, Sparkles, Copy, Clock, Star, Zap, ChevronRight, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import api from "@/services/api";
import { getPlanById } from "@/config/plans.config";

// Initialize Mercado Pago SDK
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

if (MP_PUBLIC_KEY) {
    initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
}

// Plan interface defined in config

const PixIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.1776 6.03541C17.5195 5.37728 16.4526 5.37728 15.7944 6.03541L12.0001 9.82977L8.20573 6.03541C7.54761 5.37728 6.48074 5.37728 5.82261 6.03541L2.03125 9.82677L5.82261 13.6181C6.48074 14.2763 7.54761 14.2763 8.20573 13.6181L12.0001 9.82377L15.7944 13.6181C16.4526 14.2763 17.5195 14.2763 18.1776 13.6181L21.9689 9.82677L18.1776 6.03541ZM12.0001 14.1738C10.875 14.1738 9.96291 15.0858 9.96291 16.2109C9.96291 17.336 10.875 18.2481 12.0001 18.2481C13.1251 18.2481 14.0372 17.336 14.0372 16.2109C14.0372 15.0858 13.1251 14.1738 12.0001 14.1738Z" />
    </svg>
);

// Plans defined in config

type PaymentMethod = 'card' | 'pix' | 'boleto';
type PaymentStep = 'selection' | 'pix_form' | 'boleto_form' | 'processing' | 'awaiting' | 'success' | 'error';

export default function Checkout() {
    const { planId } = useParams<{ planId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [step, setStep] = useState<PaymentStep>('selection');

    // For One-Time payments (Pix/Boleto)
    const [pixEmail, setPixEmail] = useState('');
    const [pixCpf, setPixCpf] = useState('');

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

    const plan = planId ? getPlanById(planId) : null;

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

    // Address data for Boleto
    const [address, setAddress] = useState({
        zipCode: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: ''
    });

    // Fetch Address from CEP
    const handleBlurCep = async () => {
        const cleanCep = address.zipCode.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setAddress(prev => ({
                    ...prev,
                    street: data.logradouro,
                    neighborhood: data.bairro,
                    city: data.localidade,
                    state: data.uf
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar CEP', error);
        }
    };

    // Pix countdown timer
    useEffect(() => {
        if (step === 'awaiting' && pixExpiration) {
            const updateTimer = () => {
                const now = new Date();
                const diff = Math.max(0, Math.floor((pixExpiration.getTime() - now.getTime()) / 1000));
                setPixTimeLeft(diff);

                if (diff <= 0) {
                    if (timerRef.current) clearInterval(timerRef.current);
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
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [step, pixExpiration, toast]);

    // Calculate prices
    const subtotal = plan?.price || 0;
    const discountAmount = discount;
    const totalAfterTrial = subtotal - discountAmount;
    // For Subscription Card 1: Total due today is 0 if trial exists
    const totalDueTodaySubscription = plan?.trialDays ? 0 : totalAfterTrial;
    // For One-time Card 2: Total due today is full amount (no trial)
    const totalDueTodayOneTime = totalAfterTrial;

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

    // Handle Card Payment (Stripe Redirect)
    const handleSubscriptionCheckout = useCallback(async () => {
        setStep('processing');
        setErrorMessage(null);

        try {
            // Call create-checkout endpoint
            const response = await api.post('/payments/create-checkout', {
                planId,
                provider: 'stripe'
            });

            if (response.data.success && response.data.initPoint) {
                // Redirect to Stripe Checkout
                window.location.href = response.data.initPoint;
            } else {
                throw new Error(response.data.error || 'Erro ao iniciar checkout');
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            setStep('error');
            setErrorMessage(error.response?.data?.error || error.message || 'Erro ao processar pagamento.');
        }
    }, [planId]);

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
                address: {
                    zip_code: address.zipCode.replace(/\D/g, ''),
                    street_name: address.street,
                    street_number: parseInt(address.number) || 0,
                    neighborhood: address.neighborhood,
                    city: address.city,
                    federal_unit: address.state
                }
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

    // Handle trial activation (legacy/direct route if needed, but primarily Stripe trial now)
    const handleActivateLegacyTrial = async () => {
        setStep('processing');
        try {
            await api.post('/payments/process-subscription', { planId: 'trial', token: 'trial' });
            toast({ title: "Teste ativado!", description: "7 dias grátis" });
            navigate('/');
        } catch {
            toast({ variant: "destructive", title: "Erro ao ativar teste" });
            setStep('selection');
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

    // Trial plan - simplified VoxelPromo style (Legacy Direct Trial)
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
                        onClick={handleActivateLegacyTrial}
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
                        className="flex items-center gap-2 text-zinc-500 hover:text-cyan-400 mb-4 transition-colors"
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
                                Vantagem Exclusiva
                            </span>
                        </h1>

                        <p className="text-zinc-400 mb-8">
                            Escolha abaixo como prefere realizar o pagamento.
                        </p>

                        {/* Plan Details Summary */}
                        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800/50 backdrop-blur-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="font-medium text-white text-lg">{plan.displayName}</div>
                                    <div className="text-sm text-zinc-500">{plan.description}</div>
                                </div>
                                <div className="text-right bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                    <span className="font-semibold text-emerald-400 text-sm">{plan.priceDisplay}/mês</span>
                                </div>
                            </div>

                            <ul className="space-y-2">
                                {plan.features.slice(0, 3).map((feature, i) => (
                                    <li key={i} className="flex items-center text-sm text-zinc-400">
                                        <Check className="w-4 h-4 text-cyan-500 mr-2 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right Column - Payment Selection */}
                <div className="bg-zinc-950 lg:w-[55%] p-6 lg:p-12 flex items-start justify-center">
                    <div className="w-full max-w-md space-y-6">

                        {step === 'selection' && (
                            <>
                                <h2 className="text-xl font-semibold text-white mb-6">
                                    Forma de Pagamento
                                </h2>

                                {/* OPTION 1: CARD (Main) */}
                                <div
                                    className="group relative bg-zinc-900 border-2 border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-5 transition-all cursor-pointer shadow-lg shadow-emerald-500/5"
                                    onClick={handleSubscriptionCheckout}
                                >
                                    {/* Badge */}
                                    <div className="absolute -top-3 left-6 bg-emerald-500 text-zinc-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                        <Star className="w-3 h-3 fill-current" />
                                        RECOMENDADO
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                            <CreditCard className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-white text-lg">Cartão de Crédito</h3>
                                                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                                                    {plan.trialDays} dias grátis
                                                </span>
                                            </div>
                                            <p className="text-zinc-400 text-sm mt-0.5">Assinatura com renovação automática</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-zinc-800" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-zinc-950 px-2 text-zinc-500">Ou pagamento único (sem trial)</span>
                                    </div>
                                </div>

                                {/* OPTION 2: PIX */}
                                <div
                                    className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 rounded-xl p-4 transition-all cursor-pointer flex items-center gap-4"
                                    onClick={() => setStep('pix_form')}
                                >
                                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700/50 text-cyan-400">
                                        <PixIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold text-zinc-200">Pix</h3>
                                            <span className="text-[10px] font-medium text-cyan-500/80 bg-cyan-500/10 px-2 py-0.5 rounded">
                                                IMEDIATO
                                            </span>
                                        </div>
                                        <p className="text-zinc-500 text-xs mt-0.5">Acesso de 30 dias (não recorrente)</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                                </div>


                                {/* OPTION 3: BOLETO */}
                                <div
                                    className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 rounded-xl p-4 transition-all cursor-pointer flex items-center gap-4"
                                    onClick={() => setStep('boleto_form')}
                                >
                                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700/50">
                                        <Barcode className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-zinc-200">Boleto Bancário</h3>
                                        <p className="text-zinc-500 text-xs mt-0.5">Compensação em até 3 dias úteis</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                                </div>

                                <div className="text-center pt-8">
                                    <p className="text-xs text-zinc-400 mb-2">Ambiente seguro verificado</p>
                                    <div className="flex justify-center gap-3">
                                        {/* Security icons */}
                                        <div className="h-8 w-12 bg-zinc-800 rounded flex items-center justify-center border border-zinc-700">
                                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div className="h-8 w-12 bg-zinc-800 rounded flex items-center justify-center border border-zinc-700">
                                            <Lock className="w-4 h-4 text-zinc-300" />
                                        </div>
                                        <div className="h-8 w-12 bg-zinc-800 rounded flex items-center justify-center border border-zinc-700">
                                            <CreditCard className="w-4 h-4 text-zinc-300" />
                                        </div>
                                    </div>
                                </div>

                            </>
                        )}

                        {/* PIX FORM (Sub-step) */}
                        {step === 'pix_form' && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative animate-in fade-in slide-in-from-right-4 duration-300">
                                <button
                                    onClick={() => setStep('selection')}
                                    className="absolute top-6 left-6 text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>

                                <div className="text-center mb-8 mt-4">
                                    <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                                        <QrCode className="w-6 h-6 text-cyan-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Pagamento via Pix</h3>
                                    <p className="text-zinc-400 text-sm mt-1">Preencha para gerar seu código</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">Seu E-mail</label>
                                        <Input
                                            type="email"
                                            value={pixEmail}
                                            onChange={(e) => setPixEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="bg-zinc-950 border-zinc-800 text-white h-11 focus:ring-cyan-500/50 transition-all focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">Seu CPF</label>
                                        <Input
                                            value={pixCpf}
                                            onChange={(e) => setPixCpf(formatCpf(e.target.value))}
                                            placeholder="000.000.000-00"
                                            className="bg-zinc-950 border-zinc-800 text-white h-11 focus:ring-cyan-500/50 transition-all focus:border-cyan-500"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            onClick={handlePixPayment}
                                            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 font-bold rounded-xl"
                                        >
                                            Gerar Código Pix
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BOLETO FORM (Sub-step) */}
                        {step === 'boleto_form' && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative animate-in fade-in slide-in-from-right-4 duration-300">
                                <button
                                    onClick={() => setStep('selection')}
                                    className="absolute top-6 left-6 text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>

                                <div className="text-center mb-8 mt-4">
                                    <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                                        <Barcode className="w-6 h-6 text-orange-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Pagamento via Boleto</h3>
                                    <p className="text-zinc-400 text-sm mt-1">Dados para emissão</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">Seu E-mail</label>
                                        <Input
                                            type="email"
                                            value={pixEmail}
                                            onChange={(e) => setPixEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="bg-zinc-950 border-zinc-800 text-white h-11 focus:ring-orange-500/50 transition-all focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">Seu CPF</label>
                                        <Input
                                            value={pixCpf}
                                            onChange={(e) => setPixCpf(formatCpf(e.target.value))}
                                            placeholder="000.000.000-00"
                                            className="bg-zinc-950 border-zinc-800 text-white h-11 focus:ring-orange-500/50 transition-all focus:border-orange-500"
                                        />
                                    </div>

                                    <div className="pt-2 border-t border-zinc-800 mt-4">
                                        <h4 className="text-sm font-medium text-white mb-3">Endereço (obrigatório para boleto)</h4>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="col-span-1">
                                                <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">CEP</label>
                                                <Input
                                                    value={address.zipCode}
                                                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                                                    onBlur={handleBlurCep}
                                                    placeholder="00000-000"
                                                    className="bg-zinc-950 border-zinc-800 text-white h-10 text-sm focus:border-orange-500"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">Número</label>
                                                <Input
                                                    value={address.number}
                                                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                                                    placeholder="123"
                                                    className="bg-zinc-950 border-zinc-800 text-white h-10 text-sm focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">Rua</label>
                                            <Input
                                                value={address.street}
                                                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                                                placeholder="Rua Exemplo"
                                                className="bg-zinc-950 border-zinc-800 text-white h-10 text-sm focus:border-orange-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="col-span-1">
                                                <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">Bairro</label>
                                                <Input
                                                    value={address.neighborhood}
                                                    onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                                                    placeholder="Centro"
                                                    className="bg-zinc-950 border-zinc-800 text-white h-10 text-sm focus:border-orange-500"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-xs font-medium text-zinc-500 uppercase mb-1.5 block">Cidade/UF</label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={address.city}
                                                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                                        placeholder="Cidade"
                                                        className="bg-zinc-950 border-zinc-800 text-white h-10 text-sm focus:border-orange-500 flex-1"
                                                    />
                                                    <Input
                                                        value={address.state}
                                                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                                                        placeholder="UF"
                                                        maxLength={2}
                                                        className="bg-zinc-950 border-zinc-800 text-white h-10 text-sm w-12 focus:border-orange-500 text-center px-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            onClick={handleBoletoPayment}
                                            className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-bold rounded-xl"
                                        >
                                            Gerar Boleto
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Awaiting Payment (Pix/Boleto Results) */}
                        {step === 'awaiting' && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                {pixCode && (
                                    <div className="p-8 text-center relative">
                                        {/* Pix Content */}
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 animate-gradient-x opacity-70"></div>

                                        <h2 className="text-2xl font-bold text-white mb-2 mt-4">Pague com Pix</h2>
                                        <p className="text-zinc-400 mb-6 text-sm">Escaneie o QR Code abaixo</p>

                                        <div className="bg-white p-3 rounded-lg shadow-xl mx-auto w-fit mb-6 transform hover:scale-105 transition-transform duration-300">
                                            {pixQrCodeBase64 ? (
                                                <img
                                                    src={`data:image/png;base64,${pixQrCodeBase64}`}
                                                    alt="QR Code Pix"
                                                    className="w-48 h-48 mix-blend-multiply"
                                                />
                                            ) : (
                                                <div className="w-48 h-48 bg-zinc-100 rounded flex items-center justify-center">
                                                    <Loader2 className="w-10 h-10 text-zinc-300 animate-spin" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-center gap-2 mb-6">
                                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm border transition-colors ${pixTimeLeft <= 60 ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                                                <Clock className="w-4 h-4" />
                                                {Math.floor(pixTimeLeft / 60).toString().padStart(2, '0')}:{(pixTimeLeft % 60).toString().padStart(2, '0')}
                                            </div>
                                        </div>

                                        <div className="relative mb-6 group">
                                            <Input
                                                readOnly
                                                value={pixCode}
                                                className="bg-black/40 border-zinc-700 text-zinc-400 font-mono text-xs h-10 pr-12 text-center group-hover:border-zinc-500 transition-colors"
                                            />
                                            <div className="absolute right-1 top-1">
                                                <Button
                                                    size="sm"
                                                    onClick={() => copyToClipboard(pixCode)}
                                                    className="h-8 bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        <Button onClick={() => setStep('selection')} variant="link" className="text-zinc-500 hover:text-white">
                                            Escolher outra forma
                                        </Button>
                                    </div>
                                )}

                                {boletoUrl && (
                                    <div className="p-8 text-center">
                                        <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
                                            <Barcode className="w-8 h-8 text-orange-400" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white mb-2">Boleto gerado com sucesso!</h2>
                                        <Button
                                            onClick={() => window.open(boletoUrl, '_blank')}
                                            className="w-full h-12 bg-orange-600 hover:bg-orange-700 font-bold rounded-xl mb-4"
                                        >
                                            Visualizar Boleto
                                        </Button>
                                        <Button onClick={() => setStep('selection')} variant="ghost" className="text-zinc-500">
                                            Voltar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Processing State */}
                        {step === 'processing' && (
                            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-6" />
                                <p className="text-lg font-medium text-white">Processando...</p>
                                <p className="text-sm text-zinc-500">Conectando ao provedor seguro</p>
                            </div>
                        )}

                        {/* Error State */}
                        {step === 'error' && (
                            <div className="flex flex-col items-center justify-center py-10 bg-red-500/5 border border-red-500/20 rounded-2xl p-6 animate-in zoom-in-95 duration-300">
                                <Shield className="w-10 h-10 text-red-400 mb-4" />
                                <p className="text-lg font-semibold text-white">Erro no pagamento</p>
                                <p className="text-sm text-zinc-500 mt-2 text-center mb-6">{errorMessage}</p>
                                <Button
                                    onClick={() => setStep('selection')}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white"
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
