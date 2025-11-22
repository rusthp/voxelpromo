# Como Adicionar Testes Reais

## ✅ O que já foi feito

1. **Configuração do Jest** - `jest.config.js` criado
2. **Dependências adicionadas** - jest, ts-jest, @types/jest no package.json
3. **Testes de exemplo criados:**
   - `src/services/offer/__tests__/OfferService.test.ts` - Testes completos do OfferService
   - `src/utils/__tests__/logger.test.ts` - Testes do logger

## 🚀 Passo a Passo

### 1. Instalar Dependências

```bash
npm install
```

Isso instalará Jest e todas as dependências necessárias.

### 2. Executar os Testes

```bash
# Executar todos os testes
npm test

# Executar em modo watch (re-executa automaticamente)
npm run test:watch

# Ver cobertura de código
npm run test:coverage
```

### 3. Estrutura de Testes

Crie uma pasta `__tests__` ao lado do arquivo que você quer testar:

```
src/
├── services/
│   └── offer/
│       ├── OfferService.ts          ← Código original
│       └── __tests__/
│           └── OfferService.test.ts ← Teste aqui
```

### 4. Exemplo de Teste Simples

```typescript
// src/services/example/__tests__/ExampleService.test.ts
import { ExampleService } from '../ExampleService';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
  });

  describe('methodName', () => {
    it('should return expected value', () => {
      // Arrange (Preparar)
      const input = 'test';

      // Act (Executar)
      const result = service.methodName(input);

      // Assert (Verificar)
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      const result = service.methodName(null);
      expect(result).toBeNull();
    });
  });
});
```

### 5. Testar Funções Assíncronas

```typescript
it('should fetch data', async () => {
  const result = await service.fetchData();
  expect(result).toBeDefined();
});
```

### 6. Mock de Dependências

```typescript
// No topo do arquivo
jest.mock('../../../models/Offer');
jest.mock('../../ai/AIService');

// No teste
(OfferModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);
```

## 📋 Checklist para Criar Testes

- [ ] Criar pasta `__tests__` ao lado do arquivo
- [ ] Criar arquivo `NomeDoArquivo.test.ts`
- [ ] Importar o que será testado
- [ ] Criar `describe` para agrupar testes
- [ ] Criar `it` para cada caso de teste
- [ ] Usar padrão AAA (Arrange-Act-Assert)
- [ ] Mock de dependências externas
- [ ] Testar casos de sucesso
- [ ] Testar casos de erro
- [ ] Testar casos extremos (edge cases)

## 🎯 Próximos Testes a Criar

### Prioridade Alta

1. **AliExpressService.test.ts**
   ```typescript
   // Testar:
   - convertToOffer() - conversão de produtos
   - getFeaturedPromoProducts() - paginação
   - convertToBRL() - conversão de moeda
   - safeParseFloat() - parsing seguro
   ```

2. **MercadoLivreService.test.ts**
   ```typescript
   // Testar:
   - searchProducts() - busca de produtos
   - convertToOffer() - conversão de ofertas
   - getHotDeals() - ofertas quentes
   ```

3. **CollectorService.test.ts**
   ```typescript
   // Testar:
   - collectFromAliExpress() - coleta completa
   - collectFromMercadoLivre() - coleta ML
   - collectAll() - coleta de todas as fontes
   ```

### Prioridade Média

4. **API Routes Tests**
   - `src/routes/__tests__/offer.routes.test.ts`
   - `src/routes/__tests__/auth.routes.test.ts`

5. **Utils Tests**
   - `src/utils/__tests__/validation.test.ts`
   - `src/utils/__tests__/helpers.test.ts`

## 📊 Verificar Cobertura

```bash
npm run test:coverage
```

Abrir `coverage/index.html` no navegador para ver relatório visual.

**Meta:** 80%+ de cobertura

## 🔍 Comandos Úteis

```bash
# Executar teste específico
npm test -- OfferService.test.ts

# Executar testes que correspondem a um padrão
npm test -- --testNamePattern="should save"

# Executar com mais detalhes
npm test -- --verbose

# Executar apenas testes que falharam
npm test -- --onlyFailures

# Limpar cache do Jest
npm test -- --clearCache
```

## 📚 Documentação

- **Guia Completo:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Quick Start:** [QUICK_START_TESTING.md](./QUICK_START_TESTING.md)
- **Jest Docs:** https://jestjs.io/docs/getting-started

## 💡 Dicas

1. **Comece simples** - Teste uma função por vez
2. **Use mocks** - Não dependa de APIs ou banco de dados reais
3. **Teste casos extremos** - null, undefined, valores inválidos
4. **Mantenha testes rápidos** - Testes unitários devem ser instantâneos
5. **Nomes descritivos** - `it('should return error when input is null')`

## ⚠️ Problemas Comuns

### "Cannot find module"
```bash
npm install
```

### "TypeError: Cannot read property"
- Verifique se os mocks estão configurados
- Use `jest.clearAllMocks()` no `beforeEach`

### Testes muito lentos
- Use mocks para operações de I/O
- Evite testes de integração em testes unitários

## 🎉 Exemplo Completo

Veja os testes já criados como referência:
- `src/services/offer/__tests__/OfferService.test.ts` - Exemplo completo com mocks
- `src/utils/__tests__/logger.test.ts` - Exemplo simples

