import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
    Zap,
    Share2,
    TrendingUp,
    Shield,
    Bell,
    BarChart3,
    Check,
    ArrowRight,
    MessageCircle,
    Instagram,
    Send,
    Star,
    Sparkles,
    Globe,
    Clock,
    Users,
    ChevronRight,
    Menu,
    X,
    Twitter
} from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const LandingPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/dashboard");
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const features = [
        {
            icon: Share2,
            title: "Multi-Plataforma",
            description: "Publique automaticamente no Telegram, WhatsApp, Instagram e X (Twitter).",
            color: "text-voxel-cyan",
            bgColor: "bg-voxel-cyan/10"
        },
        {
            icon: TrendingUp,
            title: "Monitoramento 24/7",
            description: "Acompanhe ofertas e variações de preço em tempo real.",
            color: "text-voxel-pink",
            bgColor: "bg-voxel-pink/10"
        },
        {
            icon: Zap,
            title: "Automação Inteligente",
            description: "Configure regras e deixe o sistema trabalhar por você.",
            color: "text-voxel-orange",
            bgColor: "bg-voxel-orange/10"
        },
        {
            icon: BarChart3,
            title: "Analytics Avançado",
            description: "Relatórios detalhados de performance e engajamento.",
            color: "text-voxel-cyan",
            bgColor: "bg-voxel-cyan/10"
        },
        {
            icon: Shield,
            title: "Seguro & Confiável",
            description: "Seus dados protegidos com criptografia de ponta.",
            color: "text-voxel-pink",
            bgColor: "bg-voxel-pink/10"
        },
        {
            icon: Bell,
            title: "Alertas em Tempo Real",
            description: "Seja notificado instantaneamente sobre oportunidades.",
            color: "text-voxel-orange",
            bgColor: "bg-voxel-orange/10"
        }
    ];

    const plans = [
        {
            name: "Grátis",
            price: "R$ 0",
            period: "/mês",
            description: "Para quem está começando",
            features: [
                "10 posts por dia",
                "2 regras de automação",
                "Telegram e WhatsApp",
                "Suporte por email",
                "Acesso à comunidade"
            ],
            cta: "Começar Grátis",
            popular: false
        },
        {
            name: "Performance",
            price: "R$ 49,90",
            period: "/mês",
            description: "Para criadores em crescimento",
            features: [
                "200 posts por dia",
                "10 regras de automação",
                "Todos os canais (Instagram/X)",
                "Analytics avançado",
                "Suporte prioritário",
                "Filtros inteligentes (Whitelist/Blacklist)"
            ],
            cta: "Assinar Agora",
            popular: true
        },
        {
            name: "Plus",
            price: "R$ 99,90",
            period: "/mês",
            description: "Para operação em escala",
            features: [
                "Posts ilimitados",
                "Regras ilimitadas",
                "Todos os canais",
                "Filtros avançados",
                "API de integração",
                "Suporte via WhatsApp dedicado",
                "Consultoria mensal"
            ],
            cta: "Falar com Vendas",
            popular: false
        }
    ];

    const stats = [
        { value: "10k+", label: "Ofertas Processadas" },
        { value: "500+", label: "Usuários Ativos" },
        { value: "99.9%", label: "Uptime" },
        { value: "24/7", label: "Monitoramento" }
    ];

    const integrations = [
        { icon: Send, name: "Telegram", color: "text-blue-400" },
        { icon: MessageCircle, name: "WhatsApp", color: "text-green-400" },
        { icon: Instagram, name: "Instagram", color: "text-pink-400" },
        { icon: Globe, name: "X (Twitter)", color: "text-sky-400" }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-lg border-b border-border" : "bg-transparent"}`}>
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(var(--voxel-cyan))] via-[hsl(var(--voxel-pink))] to-[hsl(var(--voxel-orange))] flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold">VoxelPromo</span>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
                            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Preços</a>
                            <a href="#integrations" className="text-muted-foreground hover:text-foreground transition-colors">Integrações</a>
                        </div>

                        {/* Desktop CTA */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/login">
                                <Button variant="ghost">Entrar</Button>
                            </Link>
                            <Link to="/register">
                                <Button className="glow">
                                    Começar Grátis
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in">
                            <div className="flex flex-col gap-4">
                                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
                                <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Preços</a>
                                <a href="#integrations" className="text-muted-foreground hover:text-foreground transition-colors">Integrações</a>
                                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                                    <Link to="/login">
                                        <Button variant="ghost" className="w-full">Entrar</Button>
                                    </Link>
                                    <Link to="/register">
                                        <Button className="w-full">Começar Grátis</Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background Effects - Tricolor */}
                <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--voxel-cyan)/0.05)] via-transparent to-transparent" />
                <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-[500px] h-[500px] bg-[hsl(var(--voxel-cyan)/0.08)] rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[hsl(var(--voxel-pink)/0.08)] rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/2 w-[350px] h-[350px] bg-[hsl(var(--voxel-orange)/0.06)] rounded-full blur-3xl" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Badge */}
                        <Badge variant="outline" className="mb-6 animate-fade-in border-primary/50 text-primary">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Nova versão disponível
                        </Badge>

                        {/* Headline */}
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
                            Automatize suas{" "}
                            <span className="text-gradient-brand">promoções</span>{" "}
                            em todas as redes
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
                            Publique ofertas e promoções automaticamente no Telegram, WhatsApp, Instagram e X.
                            Economize tempo e aumente seu alcance com inteligência.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
                            <Link to="/register">
                                <Button size="lg" className="glow text-lg px-8 py-6">
                                    Começar Grátis por 7 Dias
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <a href="#features">
                                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                                    Ver Recursos
                                </Button>
                            </a>
                        </div>

                        {/* Trust Badges */}
                        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-green-500" />
                                <span className="text-sm">Seguro & Privado</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                <span className="text-sm">Setup em 2 minutos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <span className="text-sm">500+ usuários ativos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 border-y border-border bg-card/30">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={stat.label} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                                <div className={`text-3xl md:text-4xl font-bold mb-2 ${index === 0 ? 'text-voxel-cyan' : index === 1 ? 'text-voxel-pink' : index === 2 ? 'text-voxel-orange' : 'text-gradient-brand'}`}>{stat.value}</div>
                                <div className="text-muted-foreground text-sm">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4">Recursos</Badge>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Tudo que você precisa para{" "}
                            <span className="text-gradient">crescer</span>
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Ferramentas poderosas para automatizar sua presença digital e maximizar resultados.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <Card key={feature.title} className="group hover:border-primary/50 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                                <CardHeader>
                                    <div className={`h-12 w-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <feature.icon className={`h-6 w-6 ${feature.color}`} />
                                    </div>
                                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base">{feature.description}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Integrations Section */}
            <section id="integrations" className="py-24 bg-card/30">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4">Integrações</Badge>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Conecte com suas{" "}
                            <span className="text-gradient">redes favoritas</span>
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Publique automaticamente em todas as plataformas com um clique.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-8">
                        {integrations.map((integration, index) => (
                            <div
                                key={integration.name}
                                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 animate-slide-up"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className={`h-16 w-16 rounded-xl bg-muted flex items-center justify-center ${integration.color}`}>
                                    <integration.icon className="h-8 w-8" />
                                </div>
                                <span className="font-medium">{integration.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4">Preços</Badge>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Planos para{" "}
                            <span className="text-gradient">cada necessidade</span>
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Comece grátis e escale conforme sua operação cresce.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {plans.map((plan, index) => (
                            <Card
                                key={plan.name}
                                className={`relative animate-slide-up ${plan.popular ? "border-primary glow" : ""}`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-primary text-primary-foreground">
                                            <Star className="h-3 w-3 mr-1" />
                                            Mais Popular
                                        </Badge>
                                    </div>
                                )}
                                <CardHeader className="text-center pb-8 pt-8">
                                    <CardTitle className="text-xl mb-2">{plan.name}</CardTitle>
                                    <div className="mb-2">
                                        <span className="text-4xl font-bold">{plan.price}</span>
                                        <span className="text-muted-foreground">{plan.period}</span>
                                    </div>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ul className="space-y-3">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-2">
                                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link to="/register" className="block pt-4">
                                        <Button
                                            className="w-full"
                                            variant={plan.popular ? "default" : "outline"}
                                        >
                                            {plan.cta}
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 bg-card/30">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4">Dúvidas Frequentes</Badge>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Perguntas <span className="text-gradient">Populares</span>
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Tire suas dúvidas e entenda por que o VoxelPromo é a melhor escolha.
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Como funciona o teste grátis?</AccordionTrigger>
                                <AccordionContent>
                                    Você tem 7 dias de acesso completo a todas as funcionalidades, sem precisar cadastrar cartão de crédito. Se gostar, pode escolher um plano depois. Se não, o acesso é apenas pausado automaticamente.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-2">
                                <AccordionTrigger>É seguro conectar minhas contas?</AccordionTrigger>
                                <AccordionContent>
                                    Sim, 100% seguro. Usamos a conexão oficial das plataformas (API) e não temos acesso à sua senha. Você pode revogar o acesso a qualquer momento diretamente nas redes sociais.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-3">
                                <AccordionTrigger>Preciso deixar o computador ligado?</AccordionTrigger>
                                <AccordionContent>
                                    Não. O VoxelPromo funciona totalmente na nuvem. Você configura suas regras uma vez e o sistema continua trabalhando 24 horas por dia, mesmo com seu computador desligado.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-4">
                                <AccordionTrigger>Posso usar meus próprios links de afiliado?</AccordionTrigger>
                                <AccordionContent>
                                    Com certeza. O sistema foi feito para isso. Você cadastra seus IDs de afiliado (Amazon, Shopee, Magalu) e nós geramos os links automaticamente com o seu código.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-5">
                                <AccordionTrigger>Quais redes sociais são aceitas?</AccordionTrigger>
                                <AccordionContent>
                                    Atualmente suportamos Instagram, Telegram, WhatsApp e X (Twitter). Você pode publicar em todas elas simultaneamente ou escolher estratégias diferentes para cada uma.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-6">
                                <AccordionTrigger>Como funcionam os grupos de WhatsApp?</AccordionTrigger>
                                <AccordionContent>
                                    O sistema envia as mensagens apenas nos horários que você configurar, respeitando limites de segurança para garantir a integridade da sua conta e a qualidade do seu grupo.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <div className="text-center mt-12">
                            <p className="text-muted-foreground mb-4">Ficou com alguma dúvida?</p>
                            <Link to="/register">
                                <Button variant="outline" className="gap-2">
                                    Começar teste grátis e explorar
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Pronto para começar?
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                        Junte-se a centenas de criadores que já automatizam suas promoções com VoxelPromo.
                    </p>
                    <Link to="/register">
                        <Button size="lg" className="glow text-lg px-8 py-6">
                            Criar Conta Grátis
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-border">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8">
                        {/* Logo & Description */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(var(--voxel-cyan))] via-[hsl(var(--voxel-pink))] to-[hsl(var(--voxel-orange))] flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-xl font-bold">VoxelPromo</span>
                            </div>
                            <p className="text-muted-foreground text-sm max-w-md">
                                A plataforma completa para automatizar publicações de ofertas e promoções em múltiplas redes sociais.
                            </p>
                        </div>

                        {/* Links */}
                        <div>
                            <h4 className="font-semibold mb-4">Produto</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#features" className="hover:text-foreground transition-colors">Recursos</a></li>
                                <li><a href="#pricing" className="hover:text-foreground transition-colors">Preços</a></li>
                                <li><a href="#integrations" className="hover:text-foreground transition-colors">Integrações</a></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
                                <li><Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link></li>
                                <li><Link to="/contato" className="hover:text-foreground transition-colors">Contato</Link></li>
                                <li><Link to="/novidades" className="hover:text-foreground transition-colors">Novidades</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} VoxelPromo. Todos os direitos reservados.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="https://t.me/voxelpromo" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Telegram">
                                <Send className="h-5 w-5" />
                            </a>
                            <a href="https://www.instagram.com/voxelpromo/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Instagram">
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a href="https://x.com/voxelpromo" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="X (Twitter)">
                                <Twitter className="h-5 w-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
