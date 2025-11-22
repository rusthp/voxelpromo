# 🎯 Melhorias de Categorização e Filtros

## 📋 Resumo das Mudanças

### 1. ✅ Categorização Inteligente

**Problema:** Produtos estavam sendo categorizados incorretamente como "electronics" quando não eram (ex: chinelos, potes de vidro).

**Solução:** Criado `CategoryService` que analisa o título e descrição do produto usando palavras-chave em português e inglês para detectar a categoria correta.

**Categorias Suportadas:**
- `electronics` - Eletrônicos (smartphones, notebooks, etc.)
- `fashion` - Moda (chinelos, roupas, acessórios)
- `home` - Casa (potes, decoração, móveis)
- `beauty` - Beleza (maquiagem, perfumes, cuidados)
- `sports` - Esportes (academia, fitness, equipamentos)
- `toys` - Brinquedos
- `books` - Livros e material escolar
- `automotive` - Automotivo
- `pets` - Pet shop
- `food` - Alimentos
- `health` - Saúde
- `other` - Outros (fallback)

### 2. 🔍 Sistema de Busca e Filtros

**Funcionalidades:**
- **Busca por texto:** Busca no título, categoria e loja
- **Filtro por loja:** Amazon, AliExpress, Shopee, etc.
- **Filtro por categoria:** Filtrar por categoria específica
- **Agrupamento:** Agrupar por loja ou categoria
- **Contador de resultados:** Mostra quantas ofertas correspondem aos filtros

### 3. 📊 Agrupamento Visual

- **Por Loja:** Agrupa ofertas por fonte (Amazon, Shopee, etc.)
- **Por Categoria:** Agrupa ofertas por categoria (electronics, fashion, etc.)
- **Sem agrupamento:** Lista todas as ofertas em ordem

## 🚀 Como Usar

### Busca e Filtros no Frontend

1. **Busca:** Digite no campo de busca para filtrar por título, categoria ou loja
2. **Filtros:** Clique em "Filtros" para:
   - Filtrar por loja específica
   - Filtrar por categoria específica
   - Escolher agrupamento (por loja, por categoria, ou nenhum)

### Recategorizar Ofertas Existentes

Para recategorizar ofertas já salvas no banco de dados:

```bash
npx ts-node scripts/recategorize-offers.ts
```

Este script:
- Busca todas as ofertas ativas
- Analisa título e descrição
- Atualiza a categoria se necessário
- Mostra estatísticas de mudanças

## 🔧 Implementação Técnica

### CategoryService

**Localização:** `src/services/category/CategoryService.ts`

**Método Principal:**
```typescript
detectCategory(title: string, description?: string, providedCategory?: string): string
```

**Como Funciona:**
1. Analisa título e descrição em busca de palavras-chave
2. Atribui pontuação para cada categoria baseado em matches
3. Retorna a categoria com maior pontuação
4. Valida categoria fornecida antes de usar
5. Usa padrões de fallback se nenhuma categoria for detectada

### Integração nos Serviços

**ShopeeService:**
- Usa `CategoryService` no método `convertToOffer`
- Detecta categoria baseado no título e `global_category1` do CSV

**AliExpressService:**
- Usa `CategoryService` no método `convertToOffer`
- Detecta categoria baseado no título do produto

### Frontend

**Componente:** `OffersListWithFilters`
- Substitui `OffersList` no `page.tsx`
- Adiciona barra de busca e painel de filtros
- Suporta agrupamento visual

## 📈 Exemplos de Categorização

### Antes (Incorreto)
- "Chinelo Kenner" → `electronics` ❌
- "Pote de vidro hermético" → `electronics` ❌
- "Máquina de Waffles" → `electronics` ❌

### Depois (Correto)
- "Chinelo Kenner" → `fashion` ✅
- "Pote de vidro hermético" → `home` ✅
- "Máquina de Waffles" → `home` ✅
- "Smartphone Samsung" → `electronics` ✅
- "Notebook Dell" → `electronics` ✅

## 🎨 Interface do Usuário

### Barra de Busca
- Campo de busca com ícone de lupa
- Busca em tempo real
- Botão para limpar busca

### Painel de Filtros
- Filtro por loja (dropdown)
- Filtro por categoria (dropdown)
- Seleção de agrupamento (dropdown)
- Contador de resultados

### Agrupamento Visual
- Cabeçalho com nome do grupo
- Contador de itens por grupo
- Separador visual entre grupos

## 🔄 Próximos Passos

1. **Melhorar palavras-chave:** Adicionar mais palavras-chave baseado em análise de dados reais
2. **Machine Learning:** Considerar usar ML para categorização mais precisa
3. **Subcategorias:** Adicionar suporte a subcategorias
4. **Histórico:** Manter histórico de mudanças de categoria
5. **Validação manual:** Permitir correção manual de categorias incorretas

## 📝 Notas

- A categorização é feita automaticamente durante a coleta
- Produtos existentes precisam ser recategorizados manualmente usando o script
- O sistema é extensível - fácil adicionar novas categorias e palavras-chave
- A categorização é baseada em palavras-chave, não em ML (por enquanto)



