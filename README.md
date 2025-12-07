# 🚀 VoxelPromo - Automação de Ofertas com IA

> **Sistema inteligente de monitoramento, enriquecimento e distribuição de ofertas para afiliados.**

O **VoxelPromo** é uma solução completa para automatizar o marketing de afiliados. Ele monitora lojas, detecta promoções, usa Inteligência Artificial para criar copys persuasivas e publica automaticamente em múltiplas redes sociais.

---

## 📋 Índice

- [Funcionalidades Principais](#-funcionalidades-principais)
- [Como Funciona](#-como-funciona)
- [Tecnologias](#-tecnologias)
- [Instalação e Uso](#-instalação-e-uso)
- [Configuração](#-configuração)
  - [Painel Web](#painel-web-recomendado)
  - [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Integrações Suportadas](#-integrações-suportadas)
- [Documentação Técnica](#-documentação-técnica)

---

## ✨ Funcionalidades Principais

| Categoria | Recursos |
|-----------|----------|
| **📥 Coleta** | Monitoramento de RSS, Amazon PA-API, AliExpress Affiliate, Shopee e Mercado Livre. |
| **🧠 Inteligência** | Integração com **DeepSeek**, **Groq** e **OpenAI** para gerar descrições virais e hashtags. |
| **🔗 Afiliados** | Conversão automática de links normais para links com seu ID de afiliado. |
| **📢 Distribuição** | Postagem automática no **Telegram**, **WhatsApp** (WebJS/Baileys) e **X (Twitter)**. |
| **🖥️ Interface** | Dashboard moderno para gerenciar ofertas, configurações e ver estatísticas. |
| **📊 Analytics** | Rastreamento de cliques e desempenho das ofertas. |

---

## 🔄 Como Funciona

1.  **Monitoramento**: O sistema verifica periodicamente feeds RSS e APIs de lojas em busca de novos produtos.
2.  **Filtragem**: Aplica filtros de preço, categoria e palavras-chave (blacklist) para ignorar ofertas irrelevantes.
3.  **Enriquecimento (IA)**:
    *   Extrai dados técnicos do produto.
    *   A IA (ex: DeepSeek) analisa o produto e cria um texto de vendas (copy) persuasivo.
    *   Adiciona emojis e hashtags relevantes.
4.  **Monetização**: Substitui o link original pelo seu Link de Afiliado.
5.  **Publicação**: Envia o post formatado (Imagem + Texto + Link) para os canais configurados (Telegram, WhatsApp, etc).

---

## 🛠️ Tecnologias

*   **Backend**: Node.js, Express, TypeScript, MongoDB, Puppeteer/Playwright.
*   **Frontend**: React, Next.js, TailwindCSS (Interface Administrativa).
*   **IA**: Integrações com OpenAI API, Groq SDK e DeepSeek.

---

## 🚀 Instalação e Uso

### Pré-requisitos
*   Node.js 18+ ou 20+
*   MongoDB (Local ou Atlas)
*   Navegador Chrome (para WhatsApp WebJS)

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/voxelpromo.git
    cd voxelpromo
    ```

2.  **Instale as dependências:**
    ```bash
    # Na raiz (Backend)
    npm install

    # No Frontend
    cd frontend
    npm install
    cd ..
    ```

3.  **Configure o ambiente básico:**
    ```bash
    cp .env.example .env
    # Preencha pelo menos a string de conexão do DATABASE_URL no .env
    ```

4.  **Inicie o projeto (Backend + Frontend):**
    ```bash
    npm run dev
    ```

    *   **Backend API**: `http://localhost:3000`
    *   **Painel Admin**: `http://localhost:3001`

---

## ⚙️ Configuração

A maneira recomendada de configurar o sistema é através do **Painel Web**.

### Painel Web (Recomendado)
Acesse `http://localhost:3001/settings` para configurar:

1.  **Canais de Divulgação**: Conecte seu Bot do Telegram, conta do Twitter e WhatsApp.
2.  **Programas de Afiliados**: Insira suas IDs de associado (Amazon Tag, AliExpress App Key, etc).
3.  **Inteligência Artificial**:
    *   Escolha seu provedor: **DeepSeek** (Custo-benefício), **Groq** (Velocidade) ou **OpenAI** (Qualidade).
    *   Insira sua API Key e clique em **"Testar Conexão"**.
4.  **Automação**: Defina os intervalos de verificação de ofertas.

### Variáveis de Ambiente
Para configurações sensíveis ou de infraestrutura, edite o arquivo `.env`:

```env
# Banco de Dados
DATABASE_URL=mongodb://localhost:27017/voxelpromo

# Servidor
PORT=3000
NODE_ENV=development

# Segurança (JWT)
JWT_SECRET=sua_chave_secreta_super_segura
```

---

## 🔌 Integrações Suportadas

### Fontes de Oferta (Entrada)
*   **Amazon**: Requer credenciais da PA-API.
*   **AliExpress**: Integração via API oficial ou monitoramento de links.
*   **Shopee**: Coleta via feeds RSS/Links.
*   **Mercado Livre**: Scraping inteligente de ofertas do dia.

### Destinos (Saída)
*   **Telegram**: Envia mensagens com botões de link (Inline Keyboards).
*   **WhatsApp**: Suporta conexão via QR Code (multi-device) usando `whatsapp-web.js` ou `Baileys`.
*   **X (Twitter)**: Postagem automática de tweets via API Oficial (OAuth 1.0a/2.0).

## 🚀 Deploy em Produção (VPS)

Para colocar o projeto no ar 24/7 (usando PM2 e Nginx), consulte o guia oficial:

👉 **[Guia de Instalação e Produção (VM)](./docs/production_guide.md)**

Este guia cobre:
*   Requisitos de Hardware (VM Simples: 2 vCPU / 4GB RAM)
*   Instalação limpa no Ubuntu/Debian
*   Configuração do PM2 para Backend e Frontend
*   Otimizações de recurso

---

## 📚 Documentação Técnica

Para detalhes profundos sobre cada módulo, consulte a pasta [`docs/`](./docs):

*   [Guia de Configuração Completo](./docs/CONFIGURATION_COMPLETE.md)
*   [API Reference](./docs/API.md)
*   [Estrutura do Projeto](./docs/PROJECT_SUMMARY.md)
*   [Guia de Testes](./docs/TESTING_GUIDE.md)
*   [Solução de Problemas](./docs/TROUBLESHOOTING.md)

---

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia o [Guia de Contribuição](./CONTRIBUTING.md) antes de enviar um Pull Request.

1.  Faça um Fork do projeto
2.  Crie sua Feature Branch (`git checkout -b feature/MinhaFeature`)
3.  Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4.  Push para a Branch (`git push origin feature/MinhaFeature`)
5.  Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

