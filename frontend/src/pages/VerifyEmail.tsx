import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Token de verificação não encontrado');
            return;
        }

        verifyEmail(token);
    }, [searchParams]);

    const verifyEmail = async (token: string) => {
        try {
            const response = await api.post('/auth/verify-email', { token });
            setStatus('success');
            setMessage(response.data.message);
        } catch (error: any) {
            setStatus('error');
            setMessage(error.response?.data?.error || 'Erro ao verificar email');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center">
                            <span className="text-white font-bold text-2xl">V</span>
                        </div>
                    </div>

                    {status === 'loading' && (
                        <>
                            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                            <h1 className="text-xl font-semibold text-white mb-2">
                                Verificando seu email...
                            </h1>
                            <p className="text-white/50">
                                Aguarde enquanto confirmamos sua conta.
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h1 className="text-xl font-semibold text-white mb-2">
                                Email Verificado!
                            </h1>
                            <p className="text-white/50 mb-6">
                                {message}
                            </p>
                            <Link to="/login">
                                <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                                    Fazer Login
                                </Button>
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-10 h-10 text-red-400" />
                            </div>
                            <h1 className="text-xl font-semibold text-white mb-2">
                                Verificação Falhou
                            </h1>
                            <p className="text-white/50 mb-6">
                                {message}
                            </p>
                            <div className="space-y-3">
                                <Link to="/login">
                                    <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                                        Tentar Login
                                    </Button>
                                </Link>
                                <Link to="/register">
                                    <Button variant="ghost" className="w-full text-white/50 hover:text-white">
                                        <Mail className="w-4 h-4 mr-2" />
                                        Criar Nova Conta
                                    </Button>
                                </Link>
                            </div>
                        </>
                    )}
                </div>

                <p className="text-center text-white/30 text-sm mt-6">
                    © {new Date().getFullYear()} VoxelPromo. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
