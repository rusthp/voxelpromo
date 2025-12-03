# 🗺️ Roadmap de Testes - Próximos Passos

## ✅ O que já está feito

- ✅ **35+ testes passando** (100% de sucesso)
- ✅ **OfferService** - 17 testes completos (55.85% cobertura)
- ✅ **Logger** - 3 testes completos (4.72% cobertura)
- ✅ **AliExpressService** - 15 testes completos
- ✅ **Jest configurado** corretamente
- ✅ **TypeScript** sem erros
- ✅ **Health Score: 79/100 (B)** - Testing: 70/100

## 🎯 Próximos Passos (Por Prioridade)

### 🔴 Prioridade ALTA - Serviços Críticos

#### 1. AliExpressService ✅ (15 testes criados)

**Por que:** Serviço mais usado, conversão de moeda, paginação

**Testes a criar:**
```typescript
// src/services/aliexpress/__tests__/AliExpressService.test.ts

describe('AliExpressService', () => {
  describe('convertToOffer', () => {
    it('should convert product to offer with BRL prices')
    it('should handle NaN values in prices')
    it('should extract coupons from product')
    it('should calculate discount correctly')
  })
  
  describe('getFeaturedPromoProducts', () => {
    it('should fetch products with pagination')
    it('should handle API errors gracefully')
  })
  
  describe('convertToBRL', () => {
    it('should convert USD to BRL using exchange rate')
  })
  
  describe('safeParseFloat', () => {
    it('should parse valid numbers')
    it('should return default for NaN')
  })
})
```

**Estimativa:** 2-3 horas

#### 2. MercadoLivreService (0 testes → Meta: 8+ testes)

**Por que:** Segunda fonte principal de ofertas

**Testes a criar:**
```typescript
// src/services/mercadolivre/__tests__/MercadoLivreService.test.ts

describe('MercadoLivreService', () => {
  describe('searchProducts', () => {
    it('should search products by query')
    it('should handle API errors')
  })
  
  describe('convertToOffer', () => {
    it('should convert ML product to offer')
    it('should calculate discount correctly')
  })
  
  describe('getHotDeals', () => {
    it('should fetch hot deals')
  })
})
```

**Estimativa:** 1-2 horas

### 🟡 Prioridade MÉDIA - Integração

#### 3. CollectorService (0 testes → Meta: 6+ testes)

**Por que:** Orquestra a coleta de todas as fontes

**Testes a criar:**
```typescript
// src/services/collector/__tests__/CollectorService.test.ts

describe('CollectorService', () => {
  describe('collectFromAliExpress', () => {
    it('should collect offers from AliExpress')
    it('should handle pagination')
  })
  
  describe('collectAll', () => {
    it('should collect from all sources')
  })
})
```

**Estimativa:** 2 horas

#### 4. API Routes (0 testes → Meta: 15+ testes)

**Por que:** Testar endpoints HTTP é essencial

**Dependência:** Instalar `supertest`
```bash
npm install --save-dev supertest @types/supertest
```

**Testes a criar:**
- `src/routes/__tests__/offer.routes.test.ts`
- `src/routes/__tests__/auth.routes.test.ts`
- `src/routes/__tests__/stats.routes.test.ts`

**Estimativa:** 3-4 horas

### 🟢 Prioridade BAIXA - Utils e Outros

#### 5. Utils (0 testes → Meta: 5+ testes)

- `src/utils/__tests__/retry.test.ts`
- `src/utils/__tests__/loadConfig.test.ts`

**Estimativa:** 1 hora

## 📊 Meta de Cobertura

### Atual (estimado)
- **OfferService:** ~60-70%
- **Logger:** ~80%
- **Outros:** ~0-10%
- **Geral:** ~15-20%

### Meta
- **Geral:** 80%+ (configurado no jest.config.js)
- **Serviços críticos:** 90%+
- **Utils:** 80%+

## 🚀 Como Começar

### Passo 1: Verificar Cobertura Atual

```bash
npm run test:coverage
```

Abra `coverage/index.html` para ver relatório visual.

### Passo 2: Escolher Próximo Serviço

Recomendação: **AliExpressService** (mais crítico)

### Passo 3: Criar Estrutura de Teste

```bash
# Criar diretório
mkdir -p src/services/aliexpress/__tests__

# Criar arquivo
touch src/services/aliexpress/__tests__/AliExpressService.test.ts
```

### Passo 4: Escrever Primeiro Teste

```typescript
import { AliExpressService } from '../AliExpressService';

describe('AliExpressService', () => {
  let service: AliExpressService;

  beforeEach(() => {
    service = new AliExpressService();
  });

  it('should create instance', () => {
    expect(service).toBeDefined();
  });
});
```

### Passo 5: Executar e Iterar

```bash
npm test -- AliExpressService.test.ts
```

## 📈 Progresso Esperado

### Semana 1
- [ ] AliExpressService tests (10+ testes)
- [ ] Cobertura: 15% → 35%

### Semana 2
- [ ] MercadoLivreService tests (8+ testes)
- [ ] CollectorService tests (6+ testes)
- [ ] Cobertura: 35% → 55%

### Semana 3
- [ ] API Routes tests (15+ testes)
- [ ] Utils tests (5+ testes)
- [ ] Cobertura: 55% → 80% ✅

## 🎯 Quick Wins (Fácil e Rápido)

1. **Testes de funções simples** (30 min)
   - `safeParseFloat`
   - `convertToBRL`
   - Helpers de validação

2. **Testes de mocks simples** (1 hora)
   - Testar que mocks funcionam
   - Testar casos de erro

3. **Testes de edge cases** (1 hora)
   - null, undefined
   - valores vazios
   - arrays vazios

## 💡 Dicas para Manter Qualidade

1. **Execute testes antes de commitar:**
   ```bash
   npm test
   ```

2. **Verifique cobertura regularmente:**
   ```bash
   npm run test:coverage
   ```

3. **Use watch mode durante desenvolvimento:**
   ```bash
   npm run test:watch
   ```

4. **Mantenha testes rápidos:**
   - Testes unitários: < 1 segundo
   - Testes de integração: < 5 segundos

## 📚 Recursos

- [Guia Completo de Testes](./TESTING_GUIDE.md)
- [Quick Start](./QUICK_START_TESTING.md)
- [Como Adicionar Testes](./COMO_ADICIONAR_TESTES.md)
- [Próximos Passos](./NEXT_STEPS_AFTER_TESTS.md)

