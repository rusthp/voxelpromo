# Mercado Livre - Problema de Produtos Não Aparecendo

**Date:** 2025-01-17  
**Status:** 🔍 Under Investigation

## Problema

Os produtos do Mercado Livre não estão aparecendo nos resultados da coleta.

## Análise do Código Atual

### 1. Estratégia de Busca

**Método 1: `getHotDeals()`**
- Busca por: `"promoção desconto"`
- Filtros:
  - `sort: 'price_asc'`
  - `condition: 'new'`
  - `shippingCost: 'free'`
- Limite: 20 produtos
- Filtra produtos com `original_price > price`

**Método 2: `searchProducts('eletrônicos')`**
- Busca por: `"eletrônicos"`
- Filtros:
  - `sort: 'price_asc'`
  - `condition: 'new'`
- Limite: 20 produtos

**Método 3: Fallback com termos alternativos**
- Termos: `['promoção', 'desconto', 'ofertas', 'black friday']`
- Limite: 15 produtos por termo

### 2. Filtro de Conversão

**`convertToOffer()` filtra produtos com:**
- Desconto mínimo: 5%
- Requer: `original_price > currentPrice`

**Problema potencial:**
- Muitos produtos do Mercado Livre podem não ter `original_price` na resposta da busca
- Produtos sem `original_price` são rejeitados mesmo que tenham desconto

## Possíveis Causas

### 1. ⚠️ Produtos sem `original_price` na busca

**Problema:** A API de busca (`/sites/MLB/search`) pode não retornar `original_price` para todos os produtos.

**Solução:** Buscar detalhes do produto para obter `original_price` completo.

### 2. ⚠️ Termos de busca muito específicos

**Problema:** 
- `"promoção desconto"` pode retornar poucos resultados
- `"eletrônicos"` pode retornar muitos produtos sem desconto

**Solução:** Usar termos mais amplos e filtrar depois.

### 3. ⚠️ Filtro de desconto muito restritivo

**Problema:** Desconto mínimo de 5% pode eliminar produtos válidos.

**Solução:** Reduzir ou remover filtro, ou calcular desconto de outras formas.

### 4. ⚠️ Filtro de frete grátis muito restritivo

**Problema:** `shippingCost: 'free'` pode limitar muito os resultados.

**Solução:** Remover ou tornar opcional.

## Soluções Propostas

### Solução 1: Buscar Detalhes dos Produtos ✅ (Recomendado)

**Ação:** Após buscar produtos, buscar detalhes completos para obter `original_price`.

**Benefícios:**
- Obtém `original_price` completo
- Mais informações sobre desconto
- Melhor precisão

**Implementação:**
```typescript
// Buscar produtos
const products = await searchProducts('eletrônicos', 50);

// Buscar detalhes em lote (multiget - até 20 por vez)
const detailedProducts = await getMultipleProducts(
  products.slice(0, 20).map(p => p.id)
);

// Converter com informações completas
const offers = detailedProducts
  .filter(p => p.code === 200 && p.body)
  .map(p => convertToOffer(p.body))
  .filter(o => o !== null);
```

### Solução 2: Melhorar Termos de Busca

**Ação:** Usar termos mais amplos e específicos.

**Termos sugeridos:**
- `"ofertas"` - mais genérico
- `"promoção"` - mais amplo
- `"desconto"` - específico
- `"eletrônicos"` - categoria
- `"smartphone"` - específico
- `"notebook"` - específico

### Solução 3: Remover/Ajustar Filtros Restritivos

**Ação:** Tornar filtros mais flexíveis.

**Mudanças:**
- Remover `shippingCost: 'free'` do `getHotDeals()`
- Reduzir desconto mínimo de 5% para 3%
- Aceitar produtos sem `original_price` se tiverem `discounts` na resposta

### Solução 4: Usar Categorias Específicas

**Ação:** Buscar por categorias específicas do Mercado Livre.

**Categorias sugeridas:**
- `MLB1000` - Eletrônicos, Áudio e Vídeo
- `MLB1144` - Celulares e Telefones
- `MLB1648` - Computação
- `MLB1574` - Câmeras e Acessórios

### Solução 5: Buscar Produtos em Promoção

**Ação:** Usar endpoint específico de promoções (se disponível).

**Verificar:**
- `/sites/MLB/search?q=*&deals=true`
- `/sites/MLB/search?q=*&promotion=true`
- `/sites/MLB/search?q=*&discount=true`

## Plano de Implementação

### Fase 1: Diagnóstico ✅

1. [x] Analisar código atual
2. [x] Identificar possíveis problemas
3. [ ] Adicionar logs detalhados
4. [ ] Testar busca manual

### Fase 2: Melhorias Imediatas

1. [ ] Remover filtro `shippingCost: 'free'` do `getHotDeals()`
2. [ ] Adicionar busca de detalhes dos produtos
3. [ ] Melhorar termos de busca
4. [ ] Ajustar filtro de desconto mínimo

### Fase 3: Otimizações

1. [ ] Implementar busca por categorias
2. [ ] Adicionar cache de produtos
3. [ ] Melhorar tratamento de erros
4. [ ] Adicionar métricas

## Próximos Passos

1. **Adicionar logs detalhados** para ver o que está sendo retornado
2. **Testar busca manual** para verificar se a API retorna produtos
3. **Implementar busca de detalhes** para obter `original_price`
4. **Ajustar filtros** para serem menos restritivos

---

**Last Updated:** 2025-01-17



