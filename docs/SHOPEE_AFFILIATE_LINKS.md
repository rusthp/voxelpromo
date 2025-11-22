# 🔗 Shopee Affiliate Links - Como Funciona

## 📋 Resumo

**Os links de afiliado da Shopee JÁ VÊM GERADOS no feed CSV!** ✅

Você **NÃO precisa** gerar os links manualmente. A Shopee já fornece os links de afiliado prontos no feed CSV.

## 🔍 Como Funciona

### 1. Feed CSV da Shopee

O feed CSV da Shopee contém **dois campos de link** para cada produto:

#### `product_link`
- **Tipo:** Link direto do produto
- **Exemplo:** `https://shopee.com.br/produto/123456789`
- **Uso:** Link direto sem tracking de afiliado

#### `product_short_link` ⭐
- **Tipo:** Link de afiliado pré-gerado
- **Exemplo:** `https://shp.ee/abc123` ou link com tracking
- **Uso:** Link de afiliado com tracking automático
- **Importante:** Este link já contém seu código de afiliado embutido!

### 2. Como o Sistema Usa os Links

No código (`ShopeeService.ts`):

```typescript
// Linha 211-212: Extração do CSV
product_link: record.product_link || '',
product_short_link: record.product_short_link || record.product_link || '',

// Linha 310-312: Uso no convertToOffer
const affiliateUrl = product.product_short_link || product.product_link;
const productUrl = product.product_link;
```

**Prioridade:**
1. ✅ Usa `product_short_link` (link de afiliado) se disponível
2. ⚠️ Fallback para `product_link` (link direto) se não houver short link

## 🎯 Vantagens da Shopee

### ✅ Links Pré-Gerados
- **Não precisa gerar:** Os links já vêm prontos no CSV
- **Tracking automático:** O link já contém seu código de afiliado
- **Atualização diária:** Os feeds são atualizados automaticamente todos os dias

### ✅ Sem Configuração Extra
- **Não precisa de código de afiliado no config:** Os links já vêm com tracking
- **Não precisa de API:** Tudo vem no CSV
- **Simples e direto:** Basta baixar o CSV e usar os links

## 📊 Estrutura do CSV

O CSV da Shopee inclui estas colunas relacionadas a links:

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| `product_link` | Link direto do produto | `https://shopee.com.br/produto/123456789` |
| `product_short_link` | Link de afiliado (curto) | `https://shp.ee/abc123` ou link com tracking |

## 🔄 Fluxo Completo

```
1. Shopee gera feed CSV diariamente
   ↓
2. Feed contém product_short_link (já com tracking)
   ↓
3. Sistema baixa CSV
   ↓
4. Sistema extrai product_short_link
   ↓
5. Sistema salva como affiliateUrl
   ↓
6. Link já está pronto para uso! ✅
```

## 💡 Comparação com Outras Plataformas

### Shopee vs Mercado Livre

| Aspecto | Shopee | Mercado Livre |
|---------|--------|---------------|
| **Links no Feed** | ✅ Sim, pré-gerados | ❌ Não, precisa gerar |
| **Código de Afiliado** | ✅ Já embutido no link | ⚠️ Precisa configurar |
| **Geração Manual** | ❌ Não precisa | ✅ Precisa usar `buildAffiliateLink()` |
| **Complexidade** | 🟢 Simples | 🟡 Média |

### Shopee vs AliExpress

| Aspecto | Shopee | AliExpress |
|---------|--------|------------|
| **Links no Feed** | ✅ Sim, pré-gerados | ❌ Não, precisa gerar |
| **Tracking ID** | ✅ Já embutido | ⚠️ Precisa adicionar na URL |
| **Geração Manual** | ❌ Não precisa | ✅ Precisa usar `generateAffiliateLink()` |

## 🎨 Exemplo Prático

### CSV da Shopee (exemplo de linha)

```csv
itemid,title,price,product_link,product_short_link,...
123456789,"Chinelo Kenner",169.90,https://shopee.com.br/produto/123456789,https://shp.ee/xyz789,...
```

### Como o Sistema Processa

```typescript
// 1. Parse do CSV
product_link: "https://shopee.com.br/produto/123456789"
product_short_link: "https://shp.ee/xyz789"  // ← Já é link de afiliado!

// 2. Conversão para Offer
affiliateUrl: "https://shp.ee/xyz789"  // ← Usa o short link
productUrl: "https://shopee.com.br/produto/123456789"  // ← Link direto
```

## ⚙️ Configuração Atual

No `config.json`:

```json
{
  "shopee": {
    "feedUrls": [
      "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=...",
      "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=..."
    ],
    "affiliateCode": ""  // ← Não precisa! Links já vêm com tracking
  }
}
```

**Nota:** O campo `affiliateCode` existe mas **não é usado** porque os links já vêm prontos no CSV.

## 🔍 Verificação

Para verificar se os links estão corretos:

1. **Baixe um CSV manualmente** do feed da Shopee
2. **Abra no Excel/Google Sheets**
3. **Verifique a coluna `product_short_link`**
4. **Clique no link** - deve redirecionar com tracking

## ✅ Conclusão

**A Shopee é a mais simples de todas!**

- ✅ Links já vêm gerados no CSV
- ✅ Não precisa configurar código de afiliado
- ✅ Não precisa gerar links manualmente
- ✅ Tracking automático embutido
- ✅ Atualização diária automática

**Basta baixar o CSV e usar os links que já vêm prontos!** 🎉



