import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";

const PrivacyPolicy = () => {
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
            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <article className="prose prose-neutral dark:prose-invert max-w-none">
                    <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
                    <p className="text-muted-foreground text-sm mb-8">
                        Última atualização: 06 de janeiro de 2026
                    </p>

                    <section className="mb-8">
                        <p className="text-foreground leading-relaxed">
                            A VoxelPromo está comprometida com a proteção da privacidade e dos dados pessoais de
                            seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos,
                            armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral
                            de Proteção de Dados (LGPD - Lei nº 13.709/2018), o Marco Civil da Internet
                            (Lei nº 12.965/2014) e demais legislações aplicáveis.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            Ao utilizar nossa plataforma, você declara ter lido e compreendido esta Política,
                            concordando com o tratamento de seus dados pessoais conforme aqui descrito.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">1. IDENTIFICAÇÃO DO CONTROLADOR</h2>
                        <p className="text-foreground leading-relaxed">
                            Para os fins desta Política e da LGPD, o controlador dos dados pessoais é:
                        </p>
                        <ul className="list-none mt-4 space-y-2 text-foreground">
                            <li><strong>Razão Social:</strong> VoxelPromo Tecnologia Ltda.</li>
                            <li><strong>Endereço:</strong> São Paulo, SP - Brasil</li>
                            <li><strong>E-mail de contato:</strong> privacidade@voxelpromo.com</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">2. DADOS PESSOAIS COLETADOS</h2>
                        <p className="text-foreground leading-relaxed">
                            Coletamos os seguintes dados pessoais, de acordo com as finalidades específicas:
                        </p>

                        <h3 className="text-lg font-medium mt-6 mb-3">2.1. Dados fornecidos diretamente pelo usuário:</h3>
                        <ul className="list-disc pl-6 space-y-2 text-foreground">
                            <li><strong>Dados de cadastro:</strong> nome completo, endereço de e-mail, senha (armazenada de forma criptografada), nome de usuário;</li>
                            <li><strong>Dados de perfil (opcionais):</strong> foto de perfil, nome da empresa, CPF ou CNPJ;</li>
                            <li><strong>Dados de faturamento:</strong> tipo de conta (pessoa física ou jurídica), plano contratado. Dados de pagamento são processados diretamente pelo Mercado Pago e não são armazenados em nossos servidores;</li>
                            <li><strong>Dados de comunicação:</strong> mensagens enviadas através dos canais de suporte.</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-6 mb-3">2.2. Dados coletados automaticamente:</h3>
                        <ul className="list-disc pl-6 space-y-2 text-foreground">
                            <li><strong>Dados de acesso:</strong> endereço IP, data e hora de acesso, tipo de navegador, sistema operacional;</li>
                            <li><strong>Dados de uso:</strong> funcionalidades utilizadas, ofertas publicadas, configurações de integração, histórico de atividades;</li>
                            <li><strong>Cookies e tecnologias similares:</strong> conforme descrito na Seção 9.</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-6 mb-3">2.3. Dados de integrações com terceiros:</h3>
                        <ul className="list-disc pl-6 space-y-2 text-foreground">
                            <li>Tokens de acesso e credenciais de APIs de plataformas integradas (Telegram, WhatsApp Business, Instagram, X/Twitter);</li>
                            <li>Identificadores de canais e grupos configurados.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">3. FINALIDADES DO TRATAMENTO</h2>
                        <p className="text-foreground leading-relaxed">
                            Utilizamos seus dados pessoais para as seguintes finalidades:
                        </p>
                        <table className="w-full mt-4 border-collapse">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left p-3 font-semibold">Finalidade</th>
                                    <th className="text-left p-3 font-semibold">Base Legal (LGPD)</th>
                                </tr>
                            </thead>
                            <tbody className="text-foreground">
                                <tr className="border-b border-border">
                                    <td className="p-3">Criação e gerenciamento de conta</td>
                                    <td className="p-3">Execução de contrato (Art. 7º, V)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Prestação dos serviços contratados</td>
                                    <td className="p-3">Execução de contrato (Art. 7º, V)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Processamento de pagamentos</td>
                                    <td className="p-3">Execução de contrato (Art. 7º, V)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Envio de notificações sobre o serviço</td>
                                    <td className="p-3">Execução de contrato (Art. 7º, V)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Suporte técnico e atendimento</td>
                                    <td className="p-3">Execução de contrato (Art. 7º, V)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Melhoria e personalização dos serviços</td>
                                    <td className="p-3">Legítimo interesse (Art. 7º, IX)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Analytics e métricas de uso</td>
                                    <td className="p-3">Legítimo interesse (Art. 7º, IX)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Prevenção de fraudes e segurança</td>
                                    <td className="p-3">Legítimo interesse (Art. 7º, IX)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Comunicações de marketing (opcional)</td>
                                    <td className="p-3">Consentimento (Art. 7º, I)</td>
                                </tr>
                                <tr className="border-b border-border">
                                    <td className="p-3">Cumprimento de obrigações legais</td>
                                    <td className="p-3">Obrigação legal (Art. 7º, II)</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">4. COMPARTILHAMENTO DE DADOS</h2>
                        <p className="text-foreground leading-relaxed">
                            <strong>Não vendemos, alugamos ou comercializamos seus dados pessoais.</strong> Podemos
                            compartilhar dados nas seguintes situações:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground">
                            <li><strong>Mercado Pago:</strong> Para processamento de pagamentos e gestão de assinaturas;</li>
                            <li><strong>MongoDB Atlas:</strong> Armazenamento de dados em servidores seguros na nuvem;</li>
                            <li><strong>Plataformas integradas:</strong> Telegram, WhatsApp Business API, Instagram Graph API e X API - apenas os dados necessários para publicação de ofertas conforme configurado pelo usuário;</li>
                            <li><strong>Autoridades governamentais:</strong> Quando exigido por lei, ordem judicial ou para proteger direitos da VoxelPromo;</li>
                            <li><strong>Assessores jurídicos e contábeis:</strong> Para cumprimento de obrigações legais, sob sigilo profissional.</li>
                        </ul>
                        <p className="text-foreground leading-relaxed mt-4">
                            Todos os parceiros e prestadores de serviço estão sujeitos a obrigações contratuais
                            de confidencialidade e proteção de dados equivalentes às dispostas nesta Política.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">5. TRANSFERÊNCIA INTERNACIONAL DE DADOS</h2>
                        <p className="text-foreground leading-relaxed">
                            Alguns de nossos prestadores de serviço podem estar localizados fora do Brasil.
                            Nesses casos, garantimos que a transferência internacional de dados é realizada
                            em conformidade com o Art. 33 da LGPD, através de:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground">
                            <li>Países ou organismos internacionais que proporcionem grau de proteção adequado;</li>
                            <li>Cláusulas contratuais padrão aprovadas pela ANPD;</li>
                            <li>Selos, certificados e códigos de conduta regularmente emitidos.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">6. RETENÇÃO DE DADOS</h2>
                        <p className="text-foreground leading-relaxed">
                            Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades
                            para as quais foram coletados, observando os seguintes critérios:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground">
                            <li><strong>Dados de conta:</strong> Mantidos enquanto a conta estiver ativa;</li>
                            <li><strong>Dados de uso e logs:</strong> Mantidos por 6 (seis) meses para fins de segurança e resolução de problemas;</li>
                            <li><strong>Dados de faturamento:</strong> Mantidos por 5 (cinco) anos após o encerramento da conta, conforme legislação fiscal;</li>
                            <li><strong>Dados de suporte:</strong> Mantidos por 2 (dois) anos após o encerramento do atendimento;</li>
                            <li><strong>Dados para cumprimento legal:</strong> Mantidos pelo prazo exigido pela legislação aplicável.</li>
                        </ul>
                        <p className="text-foreground leading-relaxed mt-4">
                            Após o encerramento da conta, seus dados serão anonimizados ou excluídos em até
                            30 (trinta) dias, exceto quando a retenção for necessária por obrigação legal.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">7. SEGURANÇA DOS DADOS</h2>
                        <p className="text-foreground leading-relaxed">
                            Implementamos medidas técnicas e organizacionais adequadas para proteger seus
                            dados pessoais contra acessos não autorizados, alterações, divulgação ou destruição, incluindo:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground">
                            <li>Criptografia de senhas utilizando algoritmo bcrypt;</li>
                            <li>Autenticação via tokens JWT (JSON Web Token) com expiração configurada;</li>
                            <li>Comunicações criptografadas via HTTPS/TLS;</li>
                            <li>Banco de dados com acesso restrito e criptografia em repouso;</li>
                            <li>Logs de auditoria para ações sensíveis;</li>
                            <li>Controle de acesso baseado em funções (RBAC);</li>
                            <li>Monitoramento contínuo de segurança.</li>
                        </ul>
                        <p className="text-foreground leading-relaxed mt-4">
                            Embora adotemos as melhores práticas de segurança, nenhum sistema é 100% seguro.
                            Em caso de incidente de segurança que possa acarretar risco ou dano relevante,
                            notificaremos a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares
                            afetados, conforme exigido pela LGPD.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">8. SEUS DIREITOS (LGPD)</h2>
                        <p className="text-foreground leading-relaxed">
                            A LGPD garante aos titulares de dados pessoais diversos direitos, que podem ser
                            exercidos mediante requisição à VoxelPromo:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground">
                            <li><strong>Confirmação e acesso:</strong> Confirmar a existência de tratamento e acessar seus dados pessoais;</li>
                            <li><strong>Correção:</strong> Solicitar a correção de dados incompletos, inexatos ou desatualizados;</li>
                            <li><strong>Anonimização, bloqueio ou eliminação:</strong> Solicitar, quando aplicável, a anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
                            <li><strong>Portabilidade:</strong> Solicitar a portabilidade dos dados a outro fornecedor de serviço;</li>
                            <li><strong>Eliminação:</strong> Solicitar a eliminação dos dados tratados com base no consentimento;</li>
                            <li><strong>Informação sobre compartilhamento:</strong> Obter informação das entidades com as quais compartilhamos seus dados;</li>
                            <li><strong>Revogação do consentimento:</strong> Revogar o consentimento a qualquer momento, quando aplicável;</li>
                            <li><strong>Oposição:</strong> Opor-se ao tratamento realizado com fundamento em legítimo interesse.</li>
                        </ul>
                        <p className="text-foreground leading-relaxed mt-4">
                            Para exercer seus direitos, entre em contato através do e-mail{" "}
                            <strong>privacidade@voxelpromo.com</strong> ou através da{" "}
                            <Link to="/contato" className="text-primary hover:underline">página de contato</Link>.
                            Responderemos sua solicitação em até 15 (quinze) dias.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">9. COOKIES E TECNOLOGIAS SIMILARES</h2>
                        <p className="text-foreground leading-relaxed">
                            Utilizamos cookies e tecnologias similares (como localStorage) para:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground">
                            <li><strong>Cookies essenciais:</strong> Manter sua sessão ativa e garantir o funcionamento da plataforma;</li>
                            <li><strong>Cookies de preferências:</strong> Lembrar suas preferências, como tema (claro/escuro);</li>
                            <li><strong>Cookies analíticos:</strong> Coletar dados agregados sobre o uso da plataforma para melhorias.</li>
                        </ul>
                        <p className="text-foreground leading-relaxed mt-4">
                            Você pode gerenciar os cookies através das configurações do seu navegador,
                            mas isso pode afetar a funcionalidade da plataforma.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">10. DADOS DE MENORES</h2>
                        <p className="text-foreground leading-relaxed">
                            A plataforma VoxelPromo não é destinada a menores de 18 (dezoito) anos.
                            Não coletamos intencionalmente dados pessoais de menores. Caso identifiquemos
                            que coletamos dados de um menor, procederemos com a exclusão imediata.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">11. ALTERAÇÕES NESTA POLÍTICA</h2>
                        <p className="text-foreground leading-relaxed">
                            Esta Política de Privacidade pode ser atualizada periodicamente para refletir
                            alterações em nossas práticas de privacidade ou na legislação aplicável.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            Alterações significativas serão comunicadas por e-mail ou através de aviso
                            destacado na plataforma. Recomendamos que você revise esta Política periodicamente.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            A data da última atualização está indicada no início deste documento.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">12. ENCARREGADO DE PROTEÇÃO DE DADOS (DPO)</h2>
                        <p className="text-foreground leading-relaxed">
                            Para questões relacionadas a esta Política de Privacidade, exercício de direitos
                            ou reclamações sobre tratamento de dados pessoais, entre em contato com nosso
                            Encarregado de Proteção de Dados:
                        </p>
                        <ul className="list-none mt-4 space-y-2 text-foreground">
                            <li><strong>E-mail:</strong> privacidade@voxelpromo.com</li>
                            <li><strong>Página de contato:</strong> <Link to="/contato" className="text-primary hover:underline">/contato</Link></li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">13. AUTORIDADE COMPETENTE</h2>
                        <p className="text-foreground leading-relaxed">
                            Caso você considere que o tratamento de seus dados pessoais viola a LGPD,
                            você tem o direito de apresentar reclamação à Autoridade Nacional de
                            Proteção de Dados (ANPD):
                        </p>
                        <ul className="list-none mt-4 space-y-2 text-foreground">
                            <li><strong>Website:</strong> <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.gov.br/anpd</a></li>
                        </ul>
                    </section>

                    <hr className="my-8 border-border" />
                    <p className="text-sm text-muted-foreground text-center">
                        Ao utilizar a plataforma VoxelPromo, você declara ter lido, compreendido e
                        concordado com esta Política de Privacidade.
                    </p>
                </article>
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-8 mt-12">
                <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                    © {new Date().getFullYear()} VoxelPromo. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
