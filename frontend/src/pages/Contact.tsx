import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft,
    Sparkles,
    Mail,
    MessageCircle,
    Send,
    MapPin,
    Clock,
    CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate sending (in production, send to backend)
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setSubmitted(true);
        toast({
            title: "Mensagem enviada!",
            description: "Responderemos em até 24 horas úteis.",
        });
    };

    const contactInfo = [
        {
            icon: Mail,
            title: "Email",
            description: "contato@voxelpromo.com",
            color: "text-voxel-cyan"
        },
        {
            icon: MessageCircle,
            title: "WhatsApp",
            description: "+55 (11) 99999-9999",
            color: "text-voxel-pink"
        },
        {
            icon: Clock,
            title: "Horário de Atendimento",
            description: "Seg-Sex: 9h às 18h",
            color: "text-voxel-orange"
        },
        {
            icon: MapPin,
            title: "Localização",
            description: "São Paulo, Brasil",
            color: "text-voxel-cyan"
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(var(--voxel-cyan))] via-[hsl(var(--voxel-pink))] to-[hsl(var(--voxel-orange))] flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold">VoxelPromo</span>
                        </Link>
                        <Link to="/">
                            <Button variant="ghost" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold mb-4">Entre em Contato</h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Tem alguma dúvida, sugestão ou precisa de suporte?
                            Nossa equipe está pronta para ajudar você.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Contact Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Envie sua mensagem</CardTitle>
                                <CardDescription>
                                    Preencha o formulário e responderemos em até 24 horas úteis.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {submitted ? (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold mb-2">Mensagem Enviada!</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Obrigado pelo contato. Responderemos em breve.
                                        </p>
                                        <Button variant="outline" onClick={() => setSubmitted(false)}>
                                            Enviar outra mensagem
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Nome</Label>
                                            <Input
                                                id="name"
                                                placeholder="Seu nome completo"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="seu@email.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subject">Assunto</Label>
                                            <Input
                                                id="subject"
                                                placeholder="Qual o assunto?"
                                                value={formData.subject}
                                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="message">Mensagem</Label>
                                            <Textarea
                                                id="message"
                                                placeholder="Descreva sua dúvida ou mensagem..."
                                                rows={5}
                                                value={formData.message}
                                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                "Enviando..."
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4 mr-2" />
                                                    Enviar Mensagem
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>

                        {/* Contact Info */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informações de Contato</CardTitle>
                                    <CardDescription>
                                        Escolha o canal que preferir para falar conosco.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {contactInfo.map((info) => (
                                        <div key={info.title} className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                                            <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${info.color}`}>
                                                <info.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium">{info.title}</h4>
                                                <p className="text-muted-foreground text-sm">{info.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-[hsl(var(--voxel-cyan)/0.1)] to-[hsl(var(--voxel-pink)/0.1)] border-primary/20">
                                <CardContent className="pt-6">
                                    <h3 className="font-semibold mb-2">Precisa de suporte técnico?</h3>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        Se você é cliente VoxelPromo, acesse a área logada para suporte prioritário através do sistema de tickets.
                                    </p>
                                    <Link to="/login">
                                        <Button variant="outline" className="w-full">
                                            Acessar Área do Cliente
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-8 mt-12">
                <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                    © 2026 VoxelPromo. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    );
};

export default Contact;
