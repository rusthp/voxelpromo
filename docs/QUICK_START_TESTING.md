# Quick Start: Testing

## 🚀 Como Adicionar Testes Reais

### 1. Instalar Dependências

```bash
npm install
```

Isso instalará:
- `jest` - Framework de testes
- `ts-jest` - Suporte TypeScript para Jest
- `@types/jest` - Tipos TypeScript

### 2. Executar Testes Existentes

```bash
# Executar todos os testes
npm test

# Executar em modo watch (re-executa ao salvar arquivos)
npm run test:watch

# Executar com relatório de cobertura
npm run test:coverage
```

### 3. Estrutura de Testes

Os testes devem estar em pastas `__tests__` ao lado do código:

```
src/
├── services/
│   └── offer/
│       ├── OfferService.ts
│       └── __tests__/
│           └── OfferService.test.ts  ← Teste aqui
```

### 4. Criar um Novo Teste

**Exemplo: Teste para um serviço**

```typescript
// src/services/example/__tests__/ExampleService.test.ts
import { ExampleService } from '../ExampleService';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe('expected');
  });
});
```

### 5. Padrão AAA (Arrange-Act-Assert)

```typescript
it('should calculate discount correctly', () => {
  // Arrange (Preparar)
  const originalPrice = 100;
  const currentPrice = 80;

  // Act (Executar)
  const discount = originalPrice - currentPrice;

  // Assert (Verificar)
  expect(discount).toBe(20);
});
```

### 6. Testar Funções Assíncronas

```typescript
it('should fetch data from API', async () => {
  const result = await service.fetchData();
  expect(result).toBeDefined();
});
```

### 7. Mock de Dependências

```typescript
// Mock do modelo do banco
jest.mock('../../../models/Offer');

// Mock de serviços externos
jest.mock('../../ai/AIService');
```

## 📝 Exemplos de Testes Criados

### ✅ OfferService.test.ts

Testa:
- ✅ Validação de números (NaN, valores inválidos)
- ✅ Salvar nova oferta
- ✅ Atualizar oferta existente
- ✅ Reativar oferta inativa
- ✅ Salvar múltiplas ofertas
- ✅ Prevenir duplicatas
- ✅ Buscar ofertas
- ✅ Deletar ofertas (soft e permanente)
- ✅ Estatísticas

### ✅ logger.test.ts

Testa:
- ✅ Métodos do logger
- ✅ Logging de mensagens

## 🎯 Próximos Testes a Criar

1. **AliExpressService.test.ts**
   - Testar conversão de produtos
   - Testar extração de preços
   - Testar conversão de moeda
   - Testar paginação

2. **MercadoLivreService.test.ts**
   - Testar busca de produtos
   - Testar conversão de ofertas

3. **CollectorService.test.ts**
   - Testar coleta de ofertas
   - Testar integração entre serviços

4. **API Routes Tests**
   - Testar endpoints REST
   - Testar autenticação
   - Testar validação de dados

## 📊 Verificar Cobertura

```bash
npm run test:coverage
```

Isso gera:
- Relatório no terminal
- Relatório HTML em `coverage/index.html`
- Relatório LCOV em `coverage/lcov.info`

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
```

## ⚠️ Troubleshooting

### Erro: "Cannot find module"
- Verifique se as dependências estão instaladas: `npm install`
- Verifique se o caminho do import está correto

### Erro: "TypeError: Cannot read property"
- Verifique se os mocks estão configurados corretamente
- Use `jest.clearAllMocks()` no `beforeEach`

### Testes muito lentos
- Use mocks para operações de banco de dados
- Evite testes de integração em testes unitários

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Guide](./TESTING_GUIDE.md) - Guia completo
- [Jest Matchers](https://jestjs.io/docs/expect)

