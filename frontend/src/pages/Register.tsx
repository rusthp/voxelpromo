import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/services/api';
import { Loader2, UserPlus, Eye, EyeOff, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Register = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
    const [name, setName] = useState('');
    const [document, setDocument] = useState('');
    const [documentStatus, setDocumentStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
    const [documentError, setDocumentError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);

    // Validate document on blur
    const handleDocumentBlur = async () => {
        if (!document || document.replace(/\D/g, '').length < 11) {
            setDocumentStatus('idle');
            return;
        }

        setDocumentStatus('validating');
        setDocumentError('');

        try {
            const endpoint = accountType === 'individual' ? '/documents/validate-cpf' : '/documents/validate-cnpj';
            const field = accountType === 'individual' ? 'cpf' : 'cnpj';

            const response = await api.post(endpoint, { [field]: document });

            if (response.data.valid) {
                setDocumentStatus('valid');
                setDocument(response.data.formatted || document);

                // Auto-fill company name for CNPJ
                if (accountType === 'company' && response.data.razaoSocial && !name) {
                    setName(response.data.razaoSocial);
                    toast.success('Razão Social preenchida automaticamente!');
                }
            } else {
                setDocumentStatus('invalid');
                setDocumentError(response.data.message || 'Documento inválido');
            }
        } catch (error: any) {
            setDocumentStatus('invalid');
            setDocumentError('Erro ao validar documento');
        }
    };

    // Password validation matching backend requirements:
    // min 8 chars, 1 uppercase, 1 lowercase, 1 number
    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        match: password === confirmPassword && confirmPassword.length > 0,
    };

    const isFormValid =
        username.length >= 3 &&
        email.includes('@') &&
        passwordChecks.length &&
        passwordChecks.uppercase &&
        passwordChecks.lowercase &&
        passwordChecks.number &&
        passwordChecks.match &&
        acceptedPrivacyPolicy &&
        document.replace(/\D/g, '').length >= 11; // CPF/CNPJ required

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid) {
            toast.error('Por favor, preencha todos os campos corretamente');
            return;
        }

        setIsLoading(true);
        try {
            // Send undefined if document is empty to avoid Joi "not allowed to be empty" error
            const payload = {
                username,
                email,
                password,
                accountType,
                name,
                document: document || undefined,
            };

            const response = await api.post('/auth/register', payload);

            if (response.data.requiresVerification) {
                toast.success('Conta criada! Verifique seu email para ativar sua conta.');
                // Navigate to login with message
                navigate('/login', { state: { message: 'Verifique seu email antes de fazer login.' } });
            } else {
                toast.success('Conta criada com sucesso!');
                navigate('/login');
            }
        } catch (error: any) {
            console.error('Register error:', error);
            const message = error.response?.data?.error || 'Erro ao criar conta';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center glow">
                        <span className="text-primary-foreground font-bold text-3xl">V</span>
                    </div>
                </div>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Criar Conta</CardTitle>
                        <CardDescription>
                            Preencha os dados abaixo para criar sua conta
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Account Type Selection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div
                                    className={`cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all ${accountType === 'individual'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-muted hover:border-primary/50 text-muted-foreground'
                                        }`}
                                    onClick={() => setAccountType('individual')}
                                >
                                    <span className="font-semibold text-sm">Pessoa Física</span>
                                </div>
                                <div
                                    className={`cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all ${accountType === 'company'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-muted hover:border-primary/50 text-muted-foreground'
                                        }`}
                                    onClick={() => setAccountType('company')}
                                >
                                    <span className="font-semibold text-sm">Empresa / Agência</span>
                                </div>
                            </div>

                            {/* Dynamic Name Field */}
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    {accountType === 'individual' ? 'Nome Completo' : 'Razão Social'}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder={accountType === 'individual' ? 'Seu nome completo' : 'Nome da empresa'}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                            </div>

                            {/* Dynamic Document Field */}
                            <div className="space-y-2">
                                <Label htmlFor="document">
                                    {accountType === 'individual' ? 'CPF' : 'CNPJ'} *
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="document"
                                        type="text"
                                        placeholder={accountType === 'individual' ? '000.000.000-00' : '00.000.000/0000-00'}
                                        value={document}
                                        onChange={(e) => {
                                            setDocument(e.target.value);
                                            setDocumentStatus('idle');
                                        }}
                                        onBlur={handleDocumentBlur}
                                        disabled={isLoading || documentStatus === 'validating'}
                                        className={cn(
                                            "bg-background pr-10",
                                            documentStatus === 'valid' && "border-green-500",
                                            documentStatus === 'invalid' && "border-red-500"
                                        )}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {documentStatus === 'validating' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                        {documentStatus === 'valid' && <Check className="w-4 h-4 text-green-500" />}
                                        {documentStatus === 'invalid' && <X className="w-4 h-4 text-red-500" />}
                                    </div>
                                </div>
                                {documentError && (
                                    <p className="text-xs text-red-500">{documentError}</p>
                                )}
                                {documentStatus === 'valid' && accountType === 'company' && (
                                    <p className="text-xs text-green-500">✓ CNPJ validado na Receita Federal</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="seu_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    minLength={3}
                                    maxLength={30}
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mínimo 3 caracteres, sem espaços
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        disabled={isLoading}
                                        className="bg-background pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                            </div>

                            {/* Password Requirements */}
                            <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-lg">
                                <p className="font-medium text-xs mb-2">Requisitos da senha:</p>
                                <div className={cn('flex items-center gap-2 text-xs', passwordChecks.length ? 'text-green-500' : 'text-muted-foreground')}>
                                    {passwordChecks.length ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                    <span>Mínimo 8 caracteres</span>
                                </div>
                                <div className={cn('flex items-center gap-2 text-xs', passwordChecks.uppercase ? 'text-green-500' : 'text-muted-foreground')}>
                                    {passwordChecks.uppercase ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                    <span>Uma letra maiúscula</span>
                                </div>
                                <div className={cn('flex items-center gap-2 text-xs', passwordChecks.lowercase ? 'text-green-500' : 'text-muted-foreground')}>
                                    {passwordChecks.lowercase ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                    <span>Uma letra minúscula</span>
                                </div>
                                <div className={cn('flex items-center gap-2 text-xs', passwordChecks.number ? 'text-green-500' : 'text-muted-foreground')}>
                                    {passwordChecks.number ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                    <span>Um número</span>
                                </div>
                                <div className={cn('flex items-center gap-2 text-xs', passwordChecks.match ? 'text-green-500' : 'text-muted-foreground')}>
                                    {passwordChecks.match ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                    <span>Senhas coincidem</span>
                                </div>
                            </div>

                            {/* LGPD Privacy Consent - MANDATORY */}
                            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                                <div
                                    onClick={() => !isLoading && setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy)}
                                    className={cn(
                                        "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all shrink-0",
                                        acceptedPrivacyPolicy
                                            ? "bg-primary border-primary"
                                            : "border-muted-foreground/50 hover:border-primary/70"
                                    )}
                                >
                                    {acceptedPrivacyPolicy && <Check className="w-3 h-3 text-primary-foreground" />}
                                </div>
                                <label htmlFor="privacyConsent" className="text-sm text-foreground cursor-pointer select-none">
                                    Li e aceito a{' '}
                                    <Link
                                        to="/privacy"
                                        target="_blank"
                                        className="text-primary hover:underline font-medium"
                                    >
                                        Política de Privacidade
                                    </Link>
                                    {' '}e os{' '}
                                    <Link
                                        to="/terms"
                                        target="_blank"
                                        className="text-primary hover:underline font-medium"
                                    >
                                        Termos de Uso
                                    </Link>
                                    {' '}*
                                </label>
                            </div>

                            <Button
                                type="submit"
                                variant="glow"
                                className="w-full"
                                disabled={isLoading || !isFormValid}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Criando conta...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Criar Conta
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <div className="text-sm text-muted-foreground text-center">
                            Já tem uma conta?{' '}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Fazer login
                            </Link>
                        </div>
                    </CardFooter>
                </Card>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-8">
                    © {new Date().getFullYear()} VoxelPromo. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default Register;
