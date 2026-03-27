# VoxelPromo — Roadmap de Features

## Legenda
- 🔜 Planejado
- 🔧 Em desenvolvimento
- ✅ Implementado
- 💰 Feature paga separada (add-on)

---

## Plus (agency) — Features prometidas ainda não implementadas

### 🔜 API de Integração
Endpoints REST públicos para que clientes integrem o VoxelPromo em seus próprios sistemas.
- Autenticação via API Key por usuário
- Endpoints: GET /v1/offers, POST /v1/publish, GET /v1/analytics
- Rate limiting por plano
- Documentação Swagger

### 🔜 Múltiplas Contas
Permitir que um usuário Plus gerencie mais de um perfil/canal dentro da mesma conta.
- Sub-contas com configurações independentes (Telegram, WhatsApp, nicho)
- Dashboard consolidado com métricas por conta
- Limite de N sub-contas por plano

---

## Features de Add-on (venda separada)

### 💰 White-label
Clientes revendem ou usam o VoxelPromo como produto próprio, sem exposição da marca.
- Painel com logo e nome customizados
- Domínio próprio (ex: promo.seusite.com.br)
- Links curtos com domínio do cliente
- Templates de mensagem sem menção ao VoxelPromo
- Complexidade alta — requer infraestrutura de multi-tenant com domínio dinâmico

### 💰 Proxies Rotativos
Pool de proxies residenciais por cliente para evitar bloqueios de IP no scraping.
- Necessário a partir de ~10 clientes simultâneos
- ~1 proxy por 2 clientes (recomendado residencial para ML/Shopee)
- Serviços: Bright Data, Oxylabs, Smartproxy

---

## Melhorias de Infraestrutura

### 🔜 Redis para estado compartilhado
- Distributed locks para cron jobs (evitar dupla execução)
- Sessions WhatsApp persistentes entre restarts
- Base necessária para escalar além de 1 processo

### 🔜 Separação worker/API
- Processo 1: voxel-api (Express HTTP)
- Processo 2: voxel-worker (scraping + jobs + envio de mensagens)
- Melhora estabilidade e isola falhas

### 🔜 Rate limiting inteligente no scraper
- Escalonar jobs por cliente com delay entre cada um
- Evitar spike de CPU e ban de IP quando múltiplos usuários scrapeiam ao mesmo tempo

---

## Melhorias de Produto

### 🔜 Re-verificação de preço antes do envio
- Antes de enviar alerta, re-checar o preço na página
- Cancelar envio se preço mudou mais de X% (evitar alertas de flash sales expiradas)

### 🔜 Timestamp no alerta
- Exibir horário da coleta no alerta: "⏱️ Verificado às 14:32"
- Protege contra preços expirados

### 🔜 Página de registro no frontend
- Fluxo: Registro → Verificação de email → Onboarding → Trial
- Garantir que email não verificado não acessa funcionalidades

---

## Segurança / Compliance

### 🔜 Swap na VM de produção
- Adicionar 4GB de swap na VPS (atualmente 0B)
- Evita OOM kill em picos de memória

### 🔜 Enforcement de limites por canal
- Verificar `canUserPerformAction('channel', ...)` nas rotas de Instagram e X
- Trial só pode usar Telegram e WhatsApp

---

_Atualizado em: 2026-03-27_
