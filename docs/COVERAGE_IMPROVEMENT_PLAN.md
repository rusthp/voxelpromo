# 📊 Plano de Melhoria de Cobertura

## 📈 Status Atual

```
Statements:  6.38%  (Meta: 80%) ❌
Branches:    4.01%  (Meta: 80%) ❌
Functions:   9.25%  (Meta: 80%) ❌
Lines:       6.31%  (Meta: 80%) ❌
```

## 🎯 Arquivos com Cobertura

### ✅ Com Testes (mas precisa melhorar)
- **OfferService.ts**: 55.85% ⚠️ (bom, mas abaixo da meta)
- **logger.ts**: 4.72% ❌ (muito baixo)

### ❌ Sem Testes (0%)
- AliExpressService.ts (1484 linhas) - **PRIORIDADE MÁXIMA**
- MercadoLivreService.ts (723 linhas) - **PRIORIDADE ALTA**
- CollectorService.ts (516 linhas) - **PRIORIDADE ALTA**
- AmazonService.ts (254 linhas)
- ScraperService.ts (233 linhas)
- RSSService.ts (225 linhas)
- TelegramService.ts (149 linhas)
- WhatsAppService.ts (145 linhas)
- AIService.ts (193 linhas)

## 🚀 Plano de Ação (Por Impacto)

### Fase 1: Quick Wins (Aumentar de 6% → 25%)

**Objetivo:** Adicionar testes básicos para os serviços maiores

#### 1. AliExpressService (1484 linhas) - **IMPACTO MÁXIMO**
- **Cobertura atual:** 0%
- **Meta:** 40%+
- **Testes necessários:** 8-10 testes básicos
- **Impacto estimado:** +15-20% na cobertura geral

**Testes prioritários:**
```typescript
// src/services/aliexpress/__tests__/AliExpressService.test.ts

describe('AliExpressService', () => {
  // Testes básicos (rápidos de implementar)
  it('should create instance')
  it('should get config from environment')
  it('should get exchange rate from config')
  it('should convert USD to BRL')
  it('should parse float safely')
  it('should handle NaN in safeParseFloat')
  
  // Testes de conversão (mais complexos)
  it('should convert product to offer')
  it('should extract prices correctly')
  it('should calculate discount')
})
```

**Tempo estimado:** 2-3 horas
**Ganho de cobertura:** ~15%

#### 2. MercadoLivreService (723 linhas) - **IMPACTO ALTO**
- **Cobertura atual:** 0%
- **Meta:** 30%+
- **Testes necessários:** 6-8 testes básicos
- **Impacto estimado:** +8-10% na cobertura geral

**Tempo estimado:** 1-2 horas
**Ganho de cobertura:** ~8%

#### 3. Melhorar OfferService (55.85% → 80%+)
- **Cobertura atual:** 55.85%
- **Meta:** 80%+
- **Testes adicionais:** 5-7 testes
- **Impacto estimado:** +2-3% na cobertura geral

**Tempo estimado:** 1 hora
**Ganho de cobertura:** ~2%

**Total Fase 1:** 6% → ~25% (4-6 horas de trabalho)

### Fase 2: Expansão (Aumentar de 25% → 50%)

#### 4. CollectorService (516 linhas)
- **Testes necessários:** 6-8 testes
- **Tempo estimado:** 2 horas
- **Ganho:** ~5%

#### 5. Melhorar AliExpressService (40% → 60%+)
- **Testes adicionais:** 5-7 testes
- **Tempo estimado:** 2 horas
- **Ganho:** ~5%

#### 6. Utils e Helpers
- **Testes necessários:** 5-7 testes
- **Tempo estimado:** 1 hora
- **Ganho:** ~3%

**Total Fase 2:** 25% → ~50% (5 horas de trabalho)

### Fase 3: Consolidação (Aumentar de 50% → 80%)

#### 7. Serviços Restantes
- AmazonService, ScraperService, RSSService
- **Tempo estimado:** 4-5 horas
- **Ganho:** ~15%

#### 8. API Routes
- Testes de integração com supertest
- **Tempo estimado:** 3-4 horas
- **Ganho:** ~10%

#### 9. Edge Cases e Melhorias
- Testar casos extremos
- Melhorar cobertura de branches
- **Tempo estimado:** 2-3 horas
- **Ganho:** ~5%

**Total Fase 3:** 50% → ~80% (9-12 horas de trabalho)

## 📋 Checklist de Implementação

### Fase 1 (Esta Semana)
- [ ] AliExpressService - testes básicos (8-10 testes)
- [ ] MercadoLivreService - testes básicos (6-8 testes)
- [ ] OfferService - melhorar cobertura (5-7 testes)
- [ ] **Meta:** 6% → 25%

### Fase 2 (Próxima Semana)
- [ ] CollectorService - testes completos (6-8 testes)
- [ ] AliExpressService - expandir testes (5-7 testes)
- [ ] Utils - testes de helpers (5-7 testes)
- [ ] **Meta:** 25% → 50%

### Fase 3 (Semanas 3-4)
- [ ] Serviços restantes (Amazon, Scraper, RSS)
- [ ] API Routes - testes de integração
- [ ] Edge cases e melhorias
- [ ] **Meta:** 50% → 80%+

## 🎯 Estratégia de Testes

### Para Cada Serviço

1. **Testes de Instanciação** (1-2 testes)
   ```typescript
   it('should create instance')
   it('should initialize with config')
   ```

2. **Testes de Métodos Públicos** (3-5 testes)
   ```typescript
   it('should call method successfully')
   it('should handle errors gracefully')
   it('should return expected format')
   ```

3. **Testes de Helpers/Privados** (2-3 testes)
   - Testar através de métodos públicos
   - Verificar comportamento indireto

4. **Testes de Edge Cases** (2-3 testes)
   ```typescript
   it('should handle null/undefined')
   it('should handle empty arrays')
   it('should handle invalid input')
   ```

## 💡 Dicas para Aumentar Cobertura Rapidamente

### 1. Focar em Linhas de Código
- Testar métodos que têm mais linhas primeiro
- AliExpressService tem 1484 linhas = maior impacto

### 2. Testar Caminhos Felizes Primeiro
- Implementar testes básicos que cobrem o fluxo principal
- Depois adicionar testes de erro

### 3. Usar Mocks Eficientemente
- Mockar dependências externas (APIs, banco)
- Focar em testar a lógica do serviço

### 4. Testar Métodos Públicos
- Métodos privados são testados indiretamente
- Focar em métodos que são chamados externamente

## 📊 Métricas de Progresso

### Semana 1
- **Início:** 6.38%
- **Meta:** 25%
- **Foco:** AliExpress + MercadoLivre + OfferService

### Semana 2
- **Início:** 25%
- **Meta:** 50%
- **Foco:** CollectorService + Expansão

### Semana 3-4
- **Início:** 50%
- **Meta:** 80%+
- **Foco:** Serviços restantes + API Routes

## 🚀 Começar Agora

### Próximo Passo Imediato

1. **Criar testes para AliExpressService:**
   ```bash
   mkdir -p src/services/aliexpress/__tests__
   touch src/services/aliexpress/__tests__/AliExpressService.test.ts
   ```

2. **Escrever primeiro teste:**
   ```typescript
   import { AliExpressService } from '../AliExpressService';

   describe('AliExpressService', () => {
     it('should create instance', () => {
       const service = new AliExpressService();
       expect(service).toBeDefined();
     });
   });
   ```

3. **Executar e verificar:**
   ```bash
   npm test -- AliExpressService.test.ts
   npm run test:coverage
   ```

## 📈 Comandos Úteis

```bash
# Ver cobertura de um arquivo específico
npm run test:coverage -- --collectCoverageFrom='src/services/aliexpress/**'

# Ver apenas arquivos com baixa cobertura
npm run test:coverage | grep "0%"

# Ver relatório HTML detalhado
# Abrir: coverage/index.html
```

## 🎯 Meta Final

- **Statements:** 80%+
- **Branches:** 80%+
- **Functions:** 80%+
- **Lines:** 80%+

**Tempo total estimado:** 18-23 horas de trabalho
**Dividido em:** 3-4 semanas de trabalho incremental

