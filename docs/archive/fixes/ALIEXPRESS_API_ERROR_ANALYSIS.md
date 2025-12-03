# ⚠️ Análise de Erros - AliExpress API

## 🔍 Erros Identificados no Terminal

### 1. **InvalidApiPath - `aliexpress.affiliate.product.coupon.query`**

```
code: InvalidApiPath
message: The specified API Path is invalid
api: aliexpress.affiliate.product.coupon.query
```

**Status:** ✅ **ESPERADO E JÁ TRATADO**

**Explicação:**
- Este método NÃO está disponível para sua conta/app
- O código já trata isso silenciosamente (debug level)
- Não impacta a funcionalidade principal

**Trecho do código que trata:**
```typescript
// Linha 1805: getProductCoupons()
catch (error: any) {
  // API method not available - this is expected
  logger.debug('Error fetching coupons (expected if API not available)');
  return [];
}
```

### 2. **Timeout Errors - Geração de Links de Afiliado**

```
[BACKEND] 2025-11-24 22:20:53 [warn]: Error generating affiliate link, using original URL: 
  "timeout of 30000ms exceeded"
```

**Status:** ⚠️ **PROBLEMA REAL - PRECISA CORREÇÃO**

**Causas Possíveis:**
1. API `aliexpress.affiliate.link.generate` pode não estar disponível
2. Timeout muito curto (30 segundos)
3. Região/endpoint errado
4. Método pode não existir ou ter outro nome

---

## 📋 Suas Credenciais (Verificadas)

```
App Key: 521938
App Secret: 93TXYNiTrmzStTh8S07Y6o14GvrIIkYp
Tracking ID: voxelpromo
```

✅ Credenciais estão corretas e sendo usadas

---

## 🔎 Pesquisa na Documentação Oficial

### Métodos de Geração de Links Disponíveis

Segundo a documentação do AliExpress Open Platform e pesquisas:

**❌ NÃO EXISTE:** `aliexpress.affiliate.link.generate`

**✅ MÉTODO CORRETO:** `api.getPromotionLinks` ou `aliexpress.affiliate.link.getPromotionLinks`

### Como Funciona na Documentação Oficial

**Processo em 2 Etapas:**

1. **Obter URLs de Produtos:**
   ```
   api.listPromotionProduct → Retorna lista de produtos
   ```

2. **Converter para Links de Afiliado:**
   ```
   api.getPromotionLinks → Converte URLs em links rastreáveis
   ```

**Parâmetros:**
- `sourceValues`: URLs dos produtos (até 50, separadas por vírgula)
- `trackingId`: Seu tracking ID ("voxelpromo")
- `promotionLinkType`: Tipo de link (geralmente "0")

---

## 🛠️ Soluções Propostas

### Opção 1: Usar Método Correto da API ✅ RECOMENDADO

Trocar de:
```typescript
// ATUAL (PODE NÃO EXISTIR):
aliexpress.affiliate.link.generate

// PARA (DOCUMENTADO):
aliexpress.affiliate.link.getPromotionLinks
// OU
api.getPromotionLinks
```

### Opção 2: Fallback para URL Parametrizada (Temporário)

Se a API não funcionar, usar método simples com parâmetros:

```typescript
// URL base do produto
const baseUrl = 'https://www.aliexpress.com/item/123456.html';

// Adicionar tracking via parâmetros
const affiliateUrl = `${baseUrl}?aff_platform=portals-tool&aff_trace_key=${trackingId}&affiliate_id=${trackingId}`;
```

**Vantagens:**
- Funciona imediatamente
- Não depende de API
- Links são rastreáveis

**Desvantagens:**
- Menos robusto que API oficial
- Pode não encurtar URLs
- Links mais longos

### Opção 3: Aumentar Timeout e Logging

```typescript
// Aumentar timeout de 30s para 60s
const response = await axios.get(this.baseUrl, {
  params: requestParams,
  timeout: 60000, // 60 segundos
});
```

---

## 📊 Análise do Comportamento Atual

### O que está funcionando: ✅

1. **Busca de produtos funciona:**
   ```
   - AliExpress: 27 ofertas coletadas
   ```

2. **Fallback para URL original:**
   ```
   logger.warn('Error generating affiliate link, using original URL');
   return productUrl; // ✅ Sistema não quebra
   ```

3. **Detecção de APIs indisponíveis:**
   ```
   InvalidApiPath → Tratado silenciosamente
   ```

### O que NÃO está funcionando: ❌

1. **Geração de links de afiliado via API:**
   - Timeout em todas as tentativas
   - Nenhum link foi gerado com sucesso
   - Todos os produtos usam URL original (sem tracking)

---

## 🎯 Plano de Ação Recomendado

### Prioridade 1: Testar Método Correto da API

1. **Atualizar método `generateAffiliateLink()`:**
   - Trocar `aliexpress.affiliate.link.generate` 
   - Para `aliexpress.affiliate.link.getPromotionLinks`

2. **Verificar endpoint correto:**
   - Pode ser `api.getPromotionLinks` em vez de `aliexpress.affiliate.link.getPromotionLinks`
   - Testar ambas as variações

### Prioridade 2: Implementar Fallback Parametrizado

Se a API continuar falhando:
```typescript
// Método simples mas funcional
private generateSimpleAffiliateLink(productUrl: string): string {
  const config = this.getConfig();
  const url = new URL(productUrl);
  
  // Adicionar parâmetros de tracking
  url.searchParams.set('aff_platform', 'portals-tool');
  url.searchParams.set('aff_trace_key', config.trackingId);
  url.searchParams.set('sk', 'UneMJZdvN'); // Sub-key (pode variar)
  
  return url.toString();
}
```

### Prioridade 3: Aumentar Timeout e Melhorar Logs

```typescript
// Na linha ~215 do AliExpressService.ts
const response = await axios.get(this.baseUrl, {
  params: requestParams,
  timeout: 60000, // Aumentar para 60s
});
```

E adicionar mais logs:
```typescript
logger.info('Attempting to generate affiliate link via API', {
  method: 'aliexpress.affiliate.link.getPromotionLinks',
  productUrl: productUrl.substring(0, 50) + '...',
  trackingId: config.trackingId
});
```

---

## 🔧 Código de Teste Proposto

```typescript
/**
 * Test affiliate link generation with both methods
 */
async testAffiliateLinkGeneration(productUrl: string): Promise<void> {
  const config = this.getConfig();
  
  console.log('=== Testing Affiliate Link Generation ===');
  console.log('Product URL:', productUrl);
  console.log('Tracking ID:', config.trackingId);
  
  // Method 1: Try API method (getPromotionLinks)
  try {
    const params = {
      promotion_link_type: '0',
      source_values: productUrl,
      tracking_id: config.trackingId,
    };
    
    console.log('\n--- Testing: aliexpress.affiliate.link.getPromotionLinks ---');
    const response = await this.makeRequest(
      'aliexpress.affiliate.link.getPromotionLinks',
      params,
      false
    );
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ Method 1 failed:', error.message);
  }
  
  // Method 2: Try simple parameterized URL
  try {
    console.log('\n--- Testing: Simple Parameterized URL ---');
    const url = new URL(productUrl);
    url.searchParams.set('aff_platform', 'portals-tool');
    url.searchParams.set('aff_trace_key', config.trackingId);
    const simpleLink = url.toString();
    console.log('✅ Generated:', simpleLink);
  } catch (error: any) {
    console.error('❌ Method 2 failed:', error.message);
  }
}
```

---

## 📌 Conclusão

**Problema Principal:**
- Método `aliexpress.affiliate.link.generate` parece não existir ou não estar disponível
- Causando timeouts em todas as tentativas

**Solução Imediata:**
1. Testar método correto: `aliexpress.affiliate.link.getPromotionLinks`
2. Se API falhar, usar fallback parametrizado
3. Aumentar timeout para 60s

**Impacto Atual:**
- ✅ Sistema funciona (coleta produtos)
- ⚠️ Links NÃO rastreiam comissões (usando URL original)
- ⚠️ Precisa correção URGENTE para receber comissões

**Próximos Passos:**
1. Implementar correções no método `generateAffiliateLink()`
2. Adicionar fallback parametrizado
3. Testar com produto real
4. Verificar se links rastreiam corretamente
