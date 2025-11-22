# Mercado Livre - Guia Completo de Coleta

Este guia explica **todos os métodos** para coletar produtos do Mercado Livre, desde a coleta automática até processos manuais passo a passo.

## 📋 Índice

1. [Coleta Automática (Recomendado)](#1-coleta-automática-recomendado)
2. [Coleta Manual via API](#2-coleta-manual-via-api)
3. [Coleta Manual via Script](#3-coleta-manual-via-script)
4. [Coleta Manual Passo a Passo](#4-coleta-manual-passo-a-passo)
5. [Verificação e Monitoramento](#5-verificação-e-monitoramento)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Coleta Automática (Recomendado) ✅

A coleta automática é a forma mais simples e eficiente. O sistema coleta produtos automaticamente a cada 6 horas.

### Configuração

**1. Verificar configuração no `config.json`:**

```json
{
  "collection": {
    "enabled": true,
    "schedule": "0 */6 * * *",
    "sources": [
      "amazon",
      "aliexpress",
      "mercadolivre",
      "rss"
    ]
  },
  "mercadolivre": {
    "clientId": "6477386821612832",
    "clientSecret": "GO1jVyaTO7OKqXZ4tdY26PagUnxbB9ih",
    "redirectUri": "https://proplaynews.com.br/",
    "accessToken": "...",
    "refreshToken": "...",
    "tokenExpiresAt": 1763585724717
  }
}
```

**2. Iniciar o servidor:**

```bash
npm run dev
```

**3. Verificar logs:**

O sistema iniciará automaticamente e coletará produtos a cada 6 horas. Você verá logs como:

```
⏰ Running scheduled collection job
🔍 Starting Mercado Livre collection - Category: "electronics"
🔥 Fetching hot deals from Mercado Livre...
✅ Found 20 hot deals
📦 Found 50 total products from searches
✅ Collection completed: 50 offers saved
```

### Agendamento Personalizado

Para alterar a frequência, edite `src/jobs/scheduler.ts`:

```typescript
// A cada 6 horas (padrão)
cron.schedule('0 */6 * * *', async () => { ... });

// A cada 3 horas
cron.schedule('0 */3 * * *', async () => { ... });

// A cada hora
cron.schedule('0 * * * *', async () => { ... });

// Diariamente às 9h
cron.schedule('0 9 * * *', async () => { ... });
```

---

## 2. Coleta Manual via API

Você pode disparar a coleta manualmente via API REST.

### 2.1 Coleta Apenas do Mercado Livre

**Endpoint:** `POST /api/collector/mercadolivre`

**Exemplo com cURL:**
```bash
curl -X POST http://localhost:3000/api/collector/mercadolivre \
  -H "Content-Type: application/json" \
  -d '{"category": "electronics"}'
```

**Exemplo com JavaScript:**
```javascript
const response = await fetch('http://localhost:3000/api/collector/mercadolivre', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ category: 'electronics' })
});

const result = await response.json();
console.log(`Coletadas ${result.collected} ofertas`);
```

**Resposta:**
```json
{
  "success": true,
  "collected": 50
}
```

### 2.2 Coleta de Todas as Fontes

**Endpoint:** `POST /api/collector/run-all`

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/collector/run-all
```

**Resposta:**
```json
{
  "amazon": 10,
  "aliexpress": 30,
  "mercadolivre": 50,
  "rss": 5,
  "total": 95
}
```

---

## 3. Coleta Manual via Script

Crie um script para executar a coleta manualmente.

### 3.1 Script TypeScript

**Criar arquivo:** `scripts/collect-mercadolivre.ts`

```typescript
#!/usr/bin/env ts-node
import { CollectorService } from '../src/services/collector/CollectorService';
import { connectDatabase } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    console.log('📋 1. Conectando ao banco de dados...');
    await connectDatabase();
    console.log('✅ Conectado ao MongoDB\n');

    console.log('🔍 2. Iniciando coleta do Mercado Livre...');
    const collectorService = new CollectorService();
    
    const startTime = Date.now();
    const count = await collectorService.collectFromMercadoLivre('electronics');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Coleta concluída em ${duration}s`);
    console.log(`📊 Ofertas coletadas: ${count}\n`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
```

**Executar:**
```bash
npx ts-node scripts/collect-mercadolivre.ts
```

### 3.2 Script JavaScript

**Criar arquivo:** `scripts/collect-mercadolivre.js`

```javascript
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const dotenv = require('dotenv');
dotenv.config();

async function runCollection() {
  try {
    console.log('📋 1. Verificando configuração...');
    const fs = require('fs');
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (!fs.existsSync(configPath)) {
      console.error('❌ config.json não encontrado!');
      process.exit(1);
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const ml = config.mercadolivre || {};
    
    if (!ml.clientId) {
      console.error('❌ Client ID do Mercado Livre não configurado!');
      process.exit(1);
    }
    
    console.log('✅ Configuração OK');
    console.log(`   Client ID: ${ml.clientId.substring(0, 10)}...\n`);

    console.log('📦 2. Conectando ao banco de dados...');
    const { connectDatabase } = require('../src/config/database');
    
    try {
      await connectDatabase();
      console.log('✅ Conectado ao MongoDB\n');
    } catch (error) {
      console.error('❌ Erro ao conectar ao MongoDB:', error.message);
      process.exit(1);
    }

    console.log('🔍 3. Iniciando coleta do Mercado Livre...');
    const { CollectorService } = require('../src/services/collector/CollectorService');
    const collectorService = new CollectorService();
    
    const startTime = Date.now();
    const count = await collectorService.collectFromMercadoLivre('electronics');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Coleta concluída em ${duration}s`);
    console.log(`📊 Ofertas coletadas e salvas: ${count}\n`);

    if (count > 0) {
      console.log('🔍 4. Verificando ofertas salvas...');
      const { OfferService } = require('../src/services/offer/OfferService');
      const offerService = new OfferService();
      
      const offers = await offerService.getOffers({ 
        source: 'mercadolivre',
        limit: 5 
      });
      
      console.log(`\n📦 Últimas ${offers.length} ofertas coletadas:`);
      offers.forEach((offer, index) => {
        console.log(`\n${index + 1}. ${offer.title.substring(0, 60)}...`);
        console.log(`   Preço: R$ ${offer.currentPrice} (Desconto: ${offer.discountPercentage.toFixed(1)}%)`);
        console.log(`   Link: ${offer.productUrl}`);
      });
    }

    console.log('\n✅ Processo concluído com sucesso!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro durante a coleta:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runCollection();
```

**Executar:**
```bash
node scripts/collect-mercadolivre.js
```

---

## 4. Coleta Manual Passo a Passo

Se você quiser entender **exatamente** o que acontece durante a coleta, aqui está o processo detalhado:

### Passo 1: Verificar Configuração

```bash
# Verificar se config.json existe e tem as credenciais
cat config.json | grep -A 10 "mercadolivre"
```

**Deve conter:**
- ✅ `clientId`
- ✅ `clientSecret`
- ✅ `accessToken` (ou ser renovado automaticamente)
- ✅ `refreshToken`

### Passo 2: Verificar Token

```bash
# Executar teste do token
node scripts/test-mercadolivre-complete.js
```

**Deve mostrar:**
- ✅ Token válido
- ✅ Token renovado (se necessário)

### Passo 3: Conectar ao Banco de Dados

```typescript
import { connectDatabase } from './src/config/database';
await connectDatabase();
```

### Passo 4: Executar Coleta

O processo de coleta faz o seguinte:

**4.1. Buscar Hot Deals:**
```typescript
const hotDeals = await mercadoLivreService.getHotDeals(20);
// Busca por: 'promoção', 'desconto'
// Retorna: até 20 produtos com ofertas
```

**4.2. Buscar por Termos Específicos:**
```typescript
const searchTerms = [
  'eletrônicos',
  'smartphone',
  'notebook',
  'tablet',
  'fone de ouvido'
];

for (const term of searchTerms) {
  const products = await mercadoLivreService.searchProducts(term, 20, {
    sort: 'price_asc',
    condition: 'new'
  });
  // Adiciona produtos únicos à lista
}
```

**4.3. Converter para Ofertas:**
```typescript
for (const product of products) {
  const offer = mercadoLivreService.convertToOffer(product, 'electronics');
  if (offer) {
    // Salva no banco de dados
    await offerService.createOffer(offer);
  }
}
```

**4.4. Filtrar Duplicatas:**
- Verifica se o produto já existe no banco
- Compara por `productUrl` ou `source + productId`
- Ignora se já existe

### Passo 5: Verificar Resultados

```typescript
const offers = await offerService.getOffers({ 
  source: 'mercadolivre',
  limit: 10 
});

console.log(`Total de ofertas: ${offers.length}`);
```

---

## 5. Verificação e Monitoramento

### 5.1 Verificar Ofertas Coletadas

**Via API:**
```bash
curl http://localhost:3000/api/offers?source=mercadolivre&limit=10
```

**Via MongoDB:**
```javascript
const { Offer } = require('./src/models/Offer');
const offers = await Offer.find({ source: 'mercadolivre' })
  .sort({ createdAt: -1 })
  .limit(10);
```

### 5.2 Estatísticas

**Endpoint:** `GET /api/stats`

```bash
curl http://localhost:3000/api/stats
```

**Resposta:**
```json
{
  "totalOffers": 150,
  "bySource": {
    "mercadolivre": 50,
    "aliexpress": 60,
    "amazon": 30,
    "rss": 10
  },
  "byStatus": {
    "active": 120,
    "posted": 20,
    "inactive": 10
  }
}
```

### 5.3 Logs

**Ver logs em tempo real:**
```bash
# Se estiver usando PM2
pm2 logs

# Se estiver usando npm run dev
# Os logs aparecem no terminal
```

**Logs importantes:**
- `🔍 Starting Mercado Livre collection` - Início da coleta
- `🔥 Found X hot deals` - Hot deals encontrados
- `📦 Found X total products` - Total de produtos
- `✅ Collection completed: X offers` - Coleta concluída

---

## 6. Troubleshooting

### Problema: Token Expirado

**Sintoma:**
```
❌ Token inválido ou expirado na API
```

**Solução:**
```bash
# O sistema renova automaticamente, mas você pode forçar:
node scripts/test-mercadolivre-complete.js
```

### Problema: Rate Limit (403)

**Sintoma:**
```
❌ Request failed with status code 403
```

**Solução:**
- ✅ O sistema já tem retry automático
- ✅ Aguarde alguns minutos e tente novamente
- ✅ O cache reduz chamadas à API

### Problema: Nenhum Produto Coletado

**Sintoma:**
```
📊 Ofertas coletadas: 0
```

**Possíveis Causas:**
1. **Token inválido** - Verificar token
2. **Rate limit** - Aguardar alguns minutos
3. **Filtros muito restritivos** - Verificar `convertToOffer()`

**Solução:**
```bash
# Testar busca manual
node scripts/test-mercadolivre-complete.js

# Verificar logs detalhados
# Adicionar mais termos de busca no CollectorService
```

### Problema: Erro de Conexão com MongoDB

**Sintoma:**
```
❌ Erro ao conectar ao MongoDB
```

**Solução:**
1. Verificar se MongoDB está rodando
2. Verificar `MONGODB_URI` no `.env`
3. Testar conexão:
```bash
mongosh "sua-uri-aqui"
```

### Problema: Coleta Muito Lenta

**Sintoma:**
- Coleta demora mais de 5 minutos

**Solução:**
- ✅ Cache já implementado (reduz tempo)
- ✅ Throttling já implementado (evita rate limit)
- ✅ Retry já implementado (evita falhas)

**Otimizações:**
- Reduzir número de termos de busca
- Aumentar cache duration
- Usar coleta agendada (não manual)

---

## 7. Resumo dos Métodos

| Método | Quando Usar | Comando |
|--------|-------------|---------|
| **Automático** | Produção (recomendado) | `npm run dev` |
| **API REST** | Integração com outros sistemas | `POST /api/collector/mercadolivre` |
| **Script TS** | Desenvolvimento/Teste | `npx ts-node scripts/collect-mercadolivre.ts` |
| **Script JS** | Produção/Deploy | `node scripts/collect-mercadolivre.js` |

---

## 8. Exemplo Completo

Aqui está um exemplo completo de coleta manual:

```typescript
import { CollectorService } from './src/services/collector/CollectorService';
import { connectDatabase } from './src/config/database';

async function collectMercadoLivre() {
  try {
    // 1. Conectar ao banco
    await connectDatabase();
    console.log('✅ Conectado ao MongoDB');

    // 2. Criar serviço
    const collector = new CollectorService();

    // 3. Coletar
    console.log('🔍 Iniciando coleta...');
    const count = await collector.collectFromMercadoLivre('electronics');
    
    // 4. Resultado
    console.log(`✅ Coletadas ${count} ofertas`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

collectMercadoLivre();
```

---

## 9. Próximos Passos

Após coletar as ofertas:

1. **Gerar Posts com IA:**
   ```bash
   POST /api/offers/:id/generate-post
   ```

2. **Publicar no Telegram:**
   ```bash
   POST /api/offers/:id/post
   ```

3. **Visualizar no Frontend:**
   - Acesse `http://localhost:3000` (ou porta configurada)
   - Veja as ofertas coletadas

---

## 10. Suporte

Se tiver problemas:

1. ✅ Verificar logs
2. ✅ Executar `test-mercadolivre-complete.js`
3. ✅ Verificar configuração no `config.json`
4. ✅ Verificar conexão com MongoDB
5. ✅ Verificar token do Mercado Livre

**Documentação relacionada:**
- `docs/MERCADOLIVRE_RATE_LIMIT_FIX.md` - Proteção contra rate limit
- `docs/MERCADOLIVRE_AUTONOMOUS_SYSTEM.md` - Sistema autônomo
- `docs/MERCADOLIVRE_GUIDE.md` - Guia completo

---

**✅ Agora você tem todas as ferramentas para coletar produtos do Mercado Livre!**

