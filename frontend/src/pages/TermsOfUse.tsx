import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";

const TermsOfUse = () => {
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
                    <h1 className="text-3xl font-bold mb-2">Termos e Condições de Uso</h1>
                    <p className="text-muted-foreground text-sm mb-8">
                        Última atualização: 06 de janeiro de 2026
                    </p>

                    <section className="mb-8">
                        <p className="text-foreground leading-relaxed">
                            O presente instrumento estabelece os Termos e Condições de Uso ("Termos") que regulam
                            a utilização da plataforma VoxelPromo, serviço de software como serviço (SaaS) disponibilizado
                            por meio do website voxelpromo.com e suas aplicações ("Plataforma").
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            Ao acessar ou utilizar a Plataforma, o usuário ("Usuário" ou "Você") declara ter lido,
                            compreendido e aceito integralmente estes Termos, bem como a Política de Privacidade
                            disponível em <Link to="/privacidade" className="text-primary hover:underline">/privacidade</Link>.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">1. DEFINIÇÕES</h2>
                        <p className="text-foreground leading-relaxed">Para os fins deste instrumento, considera-se:</p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground">
                            <li><strong>Plataforma:</strong> O sistema VoxelPromo, incluindo website, APIs e funcionalidades correlatas.</li>
                            <li><strong>Serviço:</strong> Funcionalidades de automação para publicação de ofertas e promoções em redes sociais (Telegram, WhatsApp, Instagram e X/Twitter), monitoramento de produtos e analytics.</li>
                            <li><strong>Usuário:</strong> Pessoa física ou jurídica que se cadastra e utiliza a Plataforma.</li>
                            <li><strong>Conta:</strong> Cadastro pessoal do Usuário que permite acesso à Plataforma.</li>
                            <li><strong>Conteúdo do Usuário:</strong> Dados, informações, ofertas e materiais inseridos pelo Usuário na Plataforma.</li>
                            <li><strong>Plano:</strong> Modalidade de assinatura contratada pelo Usuário, com funcionalidades e limites específicos.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">2. OBJETO</h2>
                        <p className="text-foreground leading-relaxed">
                            2.1. A Plataforma VoxelPromo tem por objeto a prestação de serviços de automação para
                            monitoramento e publicação de ofertas e promoções em múltiplas redes sociais, mediante
                            licença de uso temporária, não exclusiva e intransferível do software.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            2.2. O Usuário reconhece que a VoxelPromo fornece um serviço de software como serviço (SaaS),
                            não havendo transferência de propriedade intelectual do software ou código-fonte.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            2.3. Os dados e conteúdos inseridos pelo Usuário na Plataforma permanecem de sua propriedade,
                            sendo a VoxelPromo mera operadora desses dados conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">3. CADASTRO E CONTA</h2>
                        <p className="text-foreground leading-relaxed">
                            3.1. Para utilizar a Plataforma, o Usuário deve realizar cadastro fornecendo informações
                            verdadeiras, completas e atualizadas, responsabilizando-se integralmente pela veracidade
                            dos dados informados.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            3.2. O Usuário é exclusivamente responsável pela guarda e sigilo de sua senha de acesso,
                            não devendo compartilhá-la com terceiros. Qualquer atividade realizada com suas credenciais
                            será de sua inteira responsabilidade.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            3.3. Em caso de suspeita de uso não autorizado de sua Conta, o Usuário deve notificar
                            imediatamente a VoxelPromo através dos canais de suporte.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            3.4. A VoxelPromo reserva-se o direito de recusar ou cancelar cadastros que apresentem
                            informações falsas, incompletas ou que violem estes Termos.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">4. PLANOS E PAGAMENTO</h2>
                        <p className="text-foreground leading-relaxed">
                            4.1. A Plataforma oferece diferentes planos de assinatura, cujas características,
                            limites e valores estão descritos na página de preços. O Usuário deve selecionar
                            o plano adequado às suas necessidades no momento do cadastro ou posteriormente.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            4.2. Os pagamentos são processados através do sistema Mercado Pago, estando sujeitos
                            aos termos e políticas deste processador de pagamentos. A VoxelPromo não armazena
                            dados de cartão de crédito.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            4.3. As assinaturas são cobradas antecipadamente, de acordo com o ciclo de faturamento
                            escolhido (mensal ou anual). O não pagamento até a data de vencimento poderá resultar
                            na suspensão ou cancelamento do acesso à Plataforma.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            4.4. Os valores dos planos podem ser reajustados mediante comunicação prévia de 30 (trinta)
                            dias ao Usuário, aplicando-se o novo valor no próximo ciclo de faturamento.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            4.5. O cancelamento da assinatura pode ser realizado a qualquer momento através da
                            área do cliente, sendo efetivado ao final do período já pago. Não há reembolso
                            proporcional por períodos não utilizados, exceto nos casos previstos em lei.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">5. USO ACEITÁVEL</h2>
                        <p className="text-foreground leading-relaxed">
                            5.1. O Usuário compromete-se a utilizar a Plataforma de forma ética, legal e em
                            conformidade com estes Termos, sendo vedado:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground">
                            <li>Utilizar a Plataforma para finalidades ilegais ou não autorizadas;</li>
                            <li>Violar direitos de propriedade intelectual de terceiros;</li>
                            <li>Transmitir conteúdo difamatório, ofensivo, discriminatório ou que viole direitos de terceiros;</li>
                            <li>Praticar spam ou envio de mensagens não solicitadas;</li>
                            <li>Tentar acessar áreas restritas do sistema ou de outros usuários;</li>
                            <li>Realizar engenharia reversa, decompilar ou desmontar o software;</li>
                            <li>Utilizar bots, scrapers ou automações não autorizadas;</li>
                            <li>Violar os termos de uso das plataformas de terceiros integradas (Telegram, WhatsApp, Instagram, X);</li>
                            <li>Publicar ofertas ou promoções enganosas ou fraudulentas;</li>
                            <li>Comercializar, sublicenciar ou transferir o acesso à Plataforma a terceiros.</li>
                        </ul>
                        <p className="text-foreground leading-relaxed mt-4">
                            5.2. O descumprimento destas vedações poderá resultar na suspensão ou cancelamento
                            imediato da Conta, sem direito a reembolso, além de responsabilização civil e criminal aplicável.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">6. INTEGRAÇÕES COM TERCEIROS</h2>
                        <p className="text-foreground leading-relaxed">
                            6.1. A Plataforma oferece integração com serviços de terceiros, incluindo Telegram,
                            WhatsApp Business API, Instagram Graph API e X (Twitter) API.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            6.2. O Usuário é responsável por cumprir os termos de uso de cada plataforma integrada,
                            isentando a VoxelPromo de qualquer responsabilidade por violações cometidas.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            6.3. A VoxelPromo não garante a disponibilidade contínua das integrações, que dependem
                            de APIs de terceiros sujeitas a alterações, limitações ou descontinuação.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">7. PROPRIEDADE INTELECTUAL</h2>
                        <p className="text-foreground leading-relaxed">
                            7.1. A VoxelPromo é titular de todos os direitos de propriedade intelectual sobre a
                            Plataforma, incluindo, mas não se limitando a, software, código-fonte, design,
                            logotipos, marcas, textos e demais elementos visuais.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            7.2. Nenhuma disposição destes Termos confere ao Usuário qualquer direito de propriedade
                            intelectual sobre a Plataforma, exceto a licença de uso limitada aqui concedida.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            7.3. O Conteúdo do Usuário inserido na Plataforma permanece de propriedade do Usuário,
                            concedendo este à VoxelPromo licença limitada para processar, armazenar e transmitir
                            tal conteúdo exclusivamente para a prestação dos Serviços.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">8. DISPONIBILIDADE E SUPORTE</h2>
                        <p className="text-foreground leading-relaxed">
                            8.1. A VoxelPromo envidará esforços comercialmente razoáveis para manter a disponibilidade
                            da Plataforma, visando uptime de 99,5% (noventa e nove vírgula cinco por cento).
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            8.2. A Plataforma poderá ficar indisponível para manutenções programadas ou emergenciais,
                            sendo o Usuário notificado com antecedência sempre que possível.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            8.3. O suporte técnico está disponível através dos canais indicados na Plataforma,
                            com tempo de resposta variável conforme o plano contratado.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">9. LIMITAÇÃO DE RESPONSABILIDADE</h2>
                        <p className="text-foreground leading-relaxed">
                            9.1. A Plataforma é fornecida "no estado em que se encontra" (as is), sem garantias
                            de qualquer natureza, expressas ou implícitas, incluindo garantias de comercialização,
                            adequação a um propósito específico ou não violação.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            9.2. Em nenhuma hipótese a VoxelPromo será responsável por danos indiretos, incidentais,
                            especiais, consequenciais ou punitivos, incluindo, sem limitação, perda de lucros,
                            dados, uso ou outras perdas intangíveis.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            9.3. A responsabilidade total da VoxelPromo por qualquer reclamação decorrente destes
                            Termos ou do uso da Plataforma será limitada ao valor total pago pelo Usuário nos
                            12 (doze) meses anteriores ao evento que deu origem à reclamação.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            9.4. O Usuário reconhece que é exclusivamente responsável pelo conteúdo que publica
                            através da Plataforma e pelas consequências de sua publicação.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">10. PROTEÇÃO DE DADOS</h2>
                        <p className="text-foreground leading-relaxed">
                            10.1. O tratamento de dados pessoais realizado pela VoxelPromo está descrito na
                            Política de Privacidade, que faz parte integrante destes Termos.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            10.2. A VoxelPromo atua como operadora de dados pessoais em relação aos dados
                            inseridos pelo Usuário na Plataforma, comprometendo-se a tratá-los em conformidade
                            com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            10.3. O Usuário é responsável por obter os consentimentos necessários para o
                            tratamento de dados pessoais de terceiros que venha a inserir na Plataforma.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">11. RESCISÃO</h2>
                        <p className="text-foreground leading-relaxed">
                            11.1. O Usuário pode encerrar sua Conta e cancelar os Serviços a qualquer momento
                            através da área do cliente.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            11.2. A VoxelPromo pode suspender ou encerrar a Conta do Usuário, a seu critério,
                            em caso de violação destes Termos, mediante notificação.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            11.3. Após o encerramento, os dados do Usuário serão mantidos por até 30 (trinta) dias
                            para eventual restauração, sendo posteriormente excluídos, ressalvadas as obrigações
                            legais de retenção.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            11.4. O Usuário pode solicitar a exportação de seus dados antes do encerramento
                            da Conta, mediante requisição através dos canais de suporte.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">12. ALTERAÇÕES DOS TERMOS</h2>
                        <p className="text-foreground leading-relaxed">
                            12.1. A VoxelPromo reserva-se o direito de modificar estes Termos a qualquer momento,
                            mediante publicação da versão atualizada na Plataforma.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            12.2. Alterações significativas serão comunicadas ao Usuário por e-mail ou através
                            de aviso na Plataforma com antecedência mínima de 15 (quinze) dias.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            12.3. O uso continuado da Plataforma após a entrada em vigor das alterações
                            constitui aceitação dos novos Termos.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">13. DISPOSIÇÕES GERAIS</h2>
                        <p className="text-foreground leading-relaxed">
                            13.1. <strong>Legislação Aplicável:</strong> Estes Termos são regidos pelas leis da
                            República Federativa do Brasil.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            13.2. <strong>Foro:</strong> Fica eleito o foro da Comarca de São Paulo, Estado de
                            São Paulo, como competente para dirimir quaisquer controvérsias oriundas destes Termos,
                            renunciando as partes a qualquer outro, por mais privilegiado que seja.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            13.3. <strong>Independência das Cláusulas:</strong> Caso qualquer disposição destes
                            Termos seja considerada inválida ou inexequível, as demais disposições permanecerão
                            em pleno vigor e efeito.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            13.4. <strong>Cessão:</strong> O Usuário não pode ceder ou transferir seus direitos
                            e obrigações sob estes Termos sem o consentimento prévio e por escrito da VoxelPromo.
                        </p>
                        <p className="text-foreground leading-relaxed mt-4">
                            13.5. <strong>Tolerância:</strong> A omissão ou tolerância de qualquer das partes em
                            exigir o cumprimento de qualquer disposição destes Termos não constituirá renúncia
                            ao direito de exigir o cumprimento posterior.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mt-8 mb-4">14. CONTATO</h2>
                        <p className="text-foreground leading-relaxed">
                            Para dúvidas, sugestões ou reclamações relacionadas a estes Termos, entre em contato:
                        </p>
                        <ul className="list-none mt-4 space-y-2 text-foreground">
                            <li><strong>E-mail:</strong> contato@voxelpromo.com</li>
                            <li><strong>Página de Contato:</strong> <Link to="/contato" className="text-primary hover:underline">/contato</Link></li>
                        </ul>
                    </section>

                    <hr className="my-8 border-border" />
                    <p className="text-sm text-muted-foreground text-center">
                        Ao utilizar a Plataforma VoxelPromo, você declara ter lido, compreendido e concordado
                        com todos os termos e condições aqui estabelecidos.
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

export default TermsOfUse;
