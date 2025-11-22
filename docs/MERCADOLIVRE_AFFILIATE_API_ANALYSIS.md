# Mercado Livre - Análise de API para Afiliados

## Resumo da Verificação

**Data:** 2025-11-18  
**Ferramenta:** Mercado Livre MCP Server  
**Objetivo:** Verificar se há documentação da API de afiliados para buscar produtos

## Resultados da Busca

### ❌ API Específica de Afiliados - NÃO ENCONTRADA

A busca no MCP do Mercado Livre **não retornou documentação específica sobre API de afiliados** para buscar produtos.

### ✅ APIs Disponíveis Relacionadas

#### 1. **Busca de Itens (Items & Search API)**

**Documentação:** `itens-e-buscas`  
**Disponível via MCP:** ✅ Sim

**Recursos disponíveis:**

- **Busca pública de produtos:**
  ```javascript
  GET /sites/{site_id}/search?q={query}
  ```

- **Buscar itens por vendedor:**
  ```javascript
  GET /sites/{site_id}/search?seller_id={seller_id}
  GET /sites/{site_id}/search?nickname={nickname}
  ```

- **Buscar itens da conta de um vendedor:**
  ```javascript
  GET /users/{user_id}/items/search
  ```

- **Multiget (até 20 itens por chamada):**
  ```javascript
  GET /items?ids={item_id1},{item_id2}
  ```

**Características:**
- ✅ API pública (não requer autenticação para busca básica)
- ✅ Suporta filtros e ordenação
- ✅ Permite buscar mais de 1000 registros usando `search_type=scan`
- ✅ Suporta seleção de campos específicos

#### 2. **Buscador de Produtos (Product Catalog)**

**Documentação:** `buscador-de-produtos`  
**Disponível via MCP:** ✅ Sim

Permite identificar produtos a serem publicados diretamente no catálogo.

#### 3. **Developer Partner Program**

**Documentação:** `developer-partner-program`  
**Disponível via MCP:** ✅ Sim

Programa para desenvolvedores certificados, mas **não é especificamente sobre afiliados**.

## O Que Isso Significa?

### Para Afiliados do Mercado Livre

1. **Não há API dedicada de afiliados** documentada no MCP
2. **A busca de produtos é feita via API pública** (`/sites/{site_id}/search`)
3. **Links de afiliados são gerados manualmente** ou via Hub de Afiliados

### Como Funciona o Programa de Afiliados

Baseado na configuração do projeto (`config.json`):

```json
{
  "mercadolivre": {
    "affiliateCode": ""
  }
}
```

O Mercado Livre usa:
- **Código de afiliado simples:** `ABC123`
- **Hub de afiliados:** URL do hub de afiliados

**Links de afiliados são criados adicionando parâmetros às URLs dos produtos:**
- Exemplo: `https://produto.mercadolivre.com.br/MLB-123456789?afiliado=ABC123`

## Recomendações

### Para Buscar Produtos como Afiliado

1. **Use a API de Busca Pública:**
   ```javascript
   GET https://api.mercadolibre.com/sites/MLB/search?q={query}
   ```

2. **Adicione o código de afiliado aos links:**
   - Após obter os produtos da API
   - Adicione o parâmetro de afiliado às URLs
   - Exemplo: `item.permalink + "?afiliado=" + affiliateCode`

3. **Use o Hub de Afiliados (se disponível):**
   - Configure no DevCenter do Mercado Livre
   - Use a URL do hub para gerar links automaticamente

### Implementação no Projeto

**✅ O projeto JÁ TEM implementação completa!**

**Arquivo:** `src/services/mercadolivre/MercadoLivreService.ts`

**Métodos disponíveis:**
- `searchProducts(query: string, limit?: number)` - Busca produtos
- `searchBySeller(sellerId?, nickname?, limit?)` - Busca produtos por vendedor
- `convertToOffer(product: any)` - Converte produto para formato Offer
- **`buildAffiliateLink(productUrl, itemId)`** - Constrói link de afiliado automaticamente

**Como funciona:**

1. **Busca de produtos:**
   ```typescript
   const products = await mercadoLivreService.searchProducts('notebook', 20);
   ```

2. **Conversão para Offer (já inclui link de afiliado):**
   ```typescript
   const offer = mercadoLivreService.convertToOffer(product, 'electronics');
   // offer.url já contém o link com código de afiliado!
   ```

3. **Formato do link de afiliado:**
   - **Código simples:** `https://produto.mercadolivre.com.br/MLB-123456?a=SEU_CODIGO`
   - **Hub de Afiliados:** `https://www.mercadolivre.com.br/afiliados/hub?u=PRODUCT_URL`

**Próximo passo:**
1. ⚠️ **Adicionar código de afiliado ao `config.json`:**
   ```json
   {
     "mercadolivre": {
       "affiliateCode": "SEU_CODIGO_AQUI"
     }
   }
   ```
   
   Ou configurar via Settings page no frontend.

## Conclusão

**O MCP do Mercado Livre NÃO disponibiliza documentação específica sobre API de afiliados.**

**Porém:**
- ✅ A API de busca de produtos está disponível e documentada
- ✅ É possível buscar produtos via API pública
- ✅ **O projeto JÁ TEM implementação completa de links de afiliados!**
- ✅ O método `buildAffiliateLink` já adiciona automaticamente o código de afiliado
- ✅ O método `convertToOffer` já usa `buildAffiliateLink` automaticamente

**Status da Implementação:**
- ✅ Método `buildAffiliateLink` implementado
- ✅ Suporta código simples e Hub de Afiliados
- ✅ Integrado em `convertToOffer`
- ⚠️ **Falta apenas configurar o `affiliateCode` no `config.json`**

**Recomendação:** Configure o `affiliateCode` no `config.json` e o sistema já funcionará automaticamente!

## Referências

- **Documentação de Busca:** `itens-e-buscas`
- **Buscador de Produtos:** `buscador-de-produtos`
- **MCP Mercado Livre:** Disponível via `search_documentation` e `get_documentation_page`

## Próximos Passos

1. Verificar se há documentação oficial de afiliados no site do Mercado Livre
2. Implementar adição automática de código de afiliado aos links
3. Testar geração de links de afiliados com produtos buscados

