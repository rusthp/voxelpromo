# Análise: Shopee e AliExpress - Busca de Produtos e Links de Afiliado

## 📊 Status Atual

### ✅ Shopee - **IMPLEMENTADO E FUNCIONAL**

#### Como Funciona

**Método de Busca:**
- **Fonte:** CSV Feeds fornecidos pelo programa de afiliados da Shopee
- **Formato:** Arquivos CSV grandes (até 200MB) com produtos pré-aprovados
- **Configuração:** URLs dos feeds em `config.json` ou variável de ambiente `SHOPEE_FEED_URLS`

**Links de Afiliado:**
- ✅ **JÁ VEM PRONTO NO FEED!**
- Campo `product_short_link` contém o link de afiliado
- Campo `product_link` contém o link normal do produto
- Sistema usa `product_short_link` como `affiliateUrl` automaticamente

**Fluxo de Dados:**
```
1. Download CSV Feed → 2. Parse CSV → 3. Extrai Produtos → 4. Converte para Offer
```

**Campos Importantes:**
```typescript
{
  product_short_link: string,  // ✅ LINK DE AFILIADO (já rastreável)
  product_link: string,         // Link normal
  itemid: string,               // ID único
  price: number,                // Preço
  sale_price: number,           // Preço com desconto
  discount_percentage: number,  // % de desconto
  title: string,                // Título
  image_link: string,           // Imagem
  global_category1: string      // Categoria
}
```

**Vantagens:**
- ✅ Links de afiliado já incluídos
- ✅ Produtos pré-aprovados pelo programa
- ✅ Sem necessidade de API key
- ✅ Dados completos (preço, desconto, imagem)
- ✅ Suporta múltiplos feeds

**Limitações:**
- ⚠️ Precisa ter acesso ao programa de afiliados da Shopee
- ⚠️ Feeds podem ser grandes (performance)
- ⚠️ Não permite busca por keyword em tempo real
- ⚠️ Depende da atualização dos feeds pela Shopee

---

### ⚠️ AliExpress - **PARCIALMENTE IMPLEMENTADO**

#### Como Funciona

**Método de Busca:**
- **API:** AliExpress Open Service API (oficial)
- **Endpoint:** `https://api-sg.aliexpress.com/sync`
- **Autenticação:** App Key + App Secret + Assinatura MD5
- **Métodos Disponíveis:**
  - `aliexpress.affiliate.product.query` - Busca por keyword
  - `aliexpress.affiliate.hotproduct.query` - Produtos quentes
  - `aliexpress.affiliate.flashdeal.query` - Ofertas relâmpago
  - `aliexpress.affiliate.featuredpromo.products.get` - Produtos em promoção

**Links de Afiliado:**
- ❌ **NÃO IMPLEMENTADO COMPLETAMENTE!**
- API retorna `product_detail_url` (link normal)
- **FALTA:** Gerar link de afiliado com `tracking_id`
- **NECESSÁRIO:** Usar método `aliexpress.affiliate.link.generate`

**Fluxo Atual (INCOMPLETO):**
```
1. Busca Produtos via API → 2. Recebe dados → 3. Converte para Offer
   ❌ FALTA: Gerar link de afiliado
```

**Campos Retornados pela API:**
```typescript
{
  product_id: string,
  product_title: string,
  product_price: { value: string, currency: string },
  original_price: { value: string, currency: string },
  product_image_url: string,
  product_detail_url: string,  // ❌ LINK NORMAL (sem rastreamento)
  shop_info: { shop_name: string },
  evaluation: { star_rate: string, valid_orders: number }
}
```

**Problemas Identificados:**

1. **❌ Links de Afiliado Não Gerados**
   - Código atual usa `product_detail_url` diretamente
   - Não há chamada para `aliexpress.affiliate.link.generate`
   - Resultado: **Links não rastreiam comissão!**

2. **⚠️ API Complexa**
   - Assinatura MD5 complicada
   - Múltiplas estruturas de resposta possíveis
   - Código tem 2222 linhas tentando lidar com variações

3. **⚠️ Conversão de Moeda**
   - Preços em USD precisam ser convertidos para BRL
   - Usa taxa de câmbio (pode ficar desatualizada)

4. **⚠️ Status da API**
   - Logs mostram "InvalidApiPath" em alguns métodos
   - Pode estar em período de ativação

---

## 🔧 O Que Falta Implementar

### 1. **AliExpress - Geração de Links de Afiliado** (CRÍTICO)

**Problema:**
```typescript
// ATUAL (ERRADO):
affiliateUrl: product.product_detail_url  // ❌ Link sem rastreamento

// DEVERIA SER:
affiliateUrl: await this.generateAffiliateLink(product.product_detail_url)
```

**Solução:**
```typescript
/**
 * Generate affiliate link using AliExpress API
 * Method: aliexpress.affiliate.link.generate
 */
async generateAffiliateLink(productUrl: string): Promise<string> {
  const config = this.getConfig();
  
  const params = {
    promotion_link_type: '0',  // 0 = Normal link
    source_values: productUrl,
    tracking_id: config.trackingId
  };
  
  const response = await this.makeRequest(
    'aliexpress.affiliate.link.generate',
    params
  );
  
  // Extract affiliate link from response
  const affiliateLink = response.aliexpress_affiliate_link_generate_response
    ?.resp_result?.result?.promotion_links?.[0]?.promotion_link;
  
  return affiliateLink || productUrl;  // Fallback to original if fails
}
```

### 2. **AliExpress - Melhorias de Configuração**

**Adicionar ao `config.json`:**
```json
{
  "aliexpress": {
    "appKey": "...",
    "appSecret": "...",
    "trackingId": "...",
    "exchangeRate": 5.8,  // ✅ Já existe
    "preferredCategories": ["electronics", "home"],  // NOVO
    "minDiscount": 10,  // NOVO - filtro mínimo
    "maxPrice": 500  // NOVO - preço máximo em USD
  }
}
```

### 3. **Shopee - Otimizações**

**Problemas de Performance:**
- Feeds CSV podem ter 10.000+ produtos
- Parse completo demora muito
- Limite atual: 10.000 produtos por feed

**Melhorias Sugeridas:**
```typescript
// 1. Cache de feeds processados
private feedCache = new Map<string, { products: ShopeeProduct[], timestamp: number }>();

// 2. Processamento incremental
async downloadFeedIncremental(feedUrl: string, lastProcessed: Date): Promise<ShopeeProduct[]> {
  // Só processa produtos novos desde lastProcessed
}

// 3. Filtros no parse (antes de criar objetos)
if (discount < minDiscount) continue;  // Skip early
if (price > maxPrice) continue;  // Skip early
```

---

## 📋 Checklist de Melhorias

### Prioridade ALTA (Crítico)

- [ ] **AliExpress: Implementar geração de links de afiliado**
  - [ ] Criar método `generateAffiliateLink()`
  - [ ] Integrar com `convertToOffer()`
  - [ ] Testar com produtos reais
  - [ ] Validar que links rastreiam comissão

- [ ] **AliExpress: Validar credenciais da API**
  - [ ] Verificar se App Key/Secret estão corretos
  - [ ] Confirmar que tracking_id está ativo
  - [ ] Testar todos os métodos disponíveis

### Prioridade MÉDIA (Importante)

- [ ] **Shopee: Otimizar performance de feeds**
  - [ ] Implementar cache de feeds
  - [ ] Adicionar filtros no parse
  - [ ] Limitar produtos por categoria

- [ ] **AliExpress: Melhorar conversão de moeda**
  - [ ] Usar API de câmbio em tempo real
  - [ ] Cache de taxa por 1 hora
  - [ ] Fallback para taxa configurada

- [ ] **Ambos: Melhorar filtros de qualidade**
  - [ ] Desconto mínimo configurável
  - [ ] Rating mínimo (AliExpress)
  - [ ] Preço máximo/mínimo

### Prioridade BAIXA (Nice to have)

- [ ] **Shopee: Busca por keyword**
  - [ ] Filtrar produtos do feed por keyword
  - [ ] Indexação para busca mais rápida

- [ ] **AliExpress: Retry logic**
  - [ ] Retry automático em caso de erro
  - [ ] Exponential backoff

- [ ] **Monitoramento**
  - [ ] Métricas de sucesso/falha por fonte
  - [ ] Alertas quando links não são gerados

---

## 🎯 Recomendações Imediatas

### 1. **Corrigir AliExpress AGORA**

O problema mais crítico é que **links do AliExpress não estão rastreando comissão**. Isso significa:
- ❌ Nenhuma comissão será creditada
- ❌ Impossível rastrear conversões
- ❌ Programa de afiliados inútil

**Ação:** Implementar `generateAffiliateLink()` imediatamente.

### 2. **Validar Shopee**

Verificar se:
- ✅ Feeds estão atualizados
- ✅ Links de afiliado funcionam
- ✅ Tracking está ativo

**Ação:** Testar um link de afiliado manualmente.

### 3. **Adicionar Testes**

Criar testes para:
```typescript
// Test 1: Shopee affiliate link format
test('Shopee affiliate link should contain tracking', () => {
  const link = 'https://shp.ee/abc123';
  expect(link).toMatch(/shp\.ee/);
});

// Test 2: AliExpress link generation
test('AliExpress should generate affiliate link', async () => {
  const service = new AliExpressService();
  const affiliateLink = await service.generateAffiliateLink('https://...');
  expect(affiliateLink).toContain('tracking_id');
});
```

---

## 📝 Exemplo de Uso Correto

### Shopee (Já Funciona)
```typescript
const shopeeService = new ShopeeService();
const products = await shopeeService.getProducts('electronics', 100);
const offers = products
  .map(p => shopeeService.convertToOffer(p, 'electronics'))
  .filter(o => o !== null);

// ✅ offers[0].affiliateUrl já contém link rastreável
```

### AliExpress (Precisa Correção)
```typescript
const aliexpressService = new AliExpressService();
const products = await aliexpressService.searchProducts('smartphone', 20);

// ❌ ATUAL (ERRADO):
const offers = products.map(p => aliexpressService.convertToOffer(p));
// offers[0].affiliateUrl = link sem rastreamento

// ✅ DEVERIA SER:
const offers = await Promise.all(
  products.map(async (p) => {
    const offer = aliexpressService.convertToOffer(p);
    offer.affiliateUrl = await aliexpressService.generateAffiliateLink(p.product_detail_url);
    return offer;
  })
);
```

---

## 🔗 Referências

- [Shopee Affiliate Program](https://affiliate.shopee.com.br/)
- [AliExpress Open Platform](https://openservice.aliexpress.com/)
- [AliExpress API Docs](https://openservice.aliexpress.com/doc/api.htm)
- Código: [`ShopeeService.ts`](file:///b:/voxelpromo/src/services/shopee/ShopeeService.ts)
- Código: [`AliExpressService.ts`](file:///b:/voxelpromo/src/services/aliexpress/AliExpressService.ts)
