# 🛍️ VoxelPromo - Sistema de Monitoramento de Ofertas

Sistema completo de monitoramento e automação de ofertas de e-commerces (Amazon, AliExpress, Shopee, etc) com geração automática de posts usando IA e envio para múltiplos canais.

## 🚀 Tecnologias

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: Next.js + React + TypeScript
- **Database**: MongoDB
- **AI**: Groq/OpenAI para geração de conteúdo
- **Automation**: node-cron para tarefas agendadas
- **Integrations**: Telegram Bot, WhatsApp Web.js

## 📋 Funcionalidades

- ✅ Coleta automática de ofertas (Amazon PA-API, AliExpress Affiliate API, RSS)
- ✅ Scraping leve de sites de promoções
- ✅ Filtros inteligentes de ofertas
- ✅ Geração automática de links de afiliado
- ✅ IA para melhorar descrições e criar posts virais
- ✅ Postagem automática em Telegram e WhatsApp
- ✅ Painel web para monitoramento e controle
- ✅ Sistema de categorias e nichos
- ✅ Logs e analytics

## 🏗️ Estrutura do Projeto

```
voxelpromo/
├── src/                    # Backend TypeScript
│   ├── server.ts          # Servidor principal
│   ├── config/            # Configurações
│   ├── models/            # Modelos MongoDB
│   ├── routes/            # Rotas da API
│   ├── services/          # Serviços (APIs, IA, etc)
│   ├── jobs/              # Cron jobs
│   ├── utils/             # Utilitários
│   └── types/             # Tipos TypeScript
├── frontend/              # Next.js Frontend
│   ├── app/               # App Router
│   ├── components/        # Componentes React
│   └── lib/               # Utilitários frontend
└── docs/                  # Documentação
```

## 🚀 Início Rápido

### Comando Único para Tudo

```bash
npm run dev
```

Este comando inicia **backend e frontend juntos**:
- ✅ Backend: http://localhost:3000
- ✅ Frontend: http://localhost:3001

## 🚀 Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
# Backend
npm install

# Frontend (PowerShell)
cd frontend; npm install; cd ..

# Ou no CMD/Bash:
cd frontend && npm install && cd ..
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 📝 Configuração

### Amazon PA-API
1. Crie uma conta no [Amazon Associates](https://affiliate-program.amazon.com/)
2. Obtenha suas credenciais (Access Key, Secret Key, Associate Tag)
3. Configure no `.env`

### AliExpress Affiliate API
1. Registre-se no [AliExpress Affiliate Program](https://portals.aliexpress.com/)
2. Obtenha App Key e App Secret
3. Configure no `.env`

### Telegram Bot
1. Crie um bot com [@BotFather](https://t.me/botfather)
2. Obtenha o token
3. Configure `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` no `.env`

### IA (Groq/OpenAI)
1. Obtenha uma API key do [Groq](https://console.groq.com/) ou [OpenAI](https://platform.openai.com/)
2. Configure no `.env`

## 📚 Documentação

Consulte a pasta `docs/` para documentação detalhada de cada módulo.

## 📄 Licença

MIT

