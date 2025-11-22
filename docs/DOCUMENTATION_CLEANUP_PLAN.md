# 📋 Plano de Limpeza e Consolidação de Documentação

## 📊 Análise dos Arquivos .md

**Total de arquivos .md em docs/:** 65 arquivos

## 🔍 Categorização

### 1. Duplicados/Similares (Consolidar)

#### Grupo A: Correções de Testes
- `TEST_FIXES.md` - Correções TypeScript/Jest
- `TEST_FIXES_APPLIED.md` - Correções aplicadas (Jest, Logger, OfferService)
- `FINAL_TEST_FIXES.md` - Últimas 2 correções
- **Ação:** Unificar em `TESTING_FIXES.md`

#### Grupo B: Próximos Passos/Status
- `STATUS_ATUAL_E_PROXIMOS_PASSOS.md` - Status atual (desatualizado: 71/100)
- `NEXT_STEPS_AFTER_TESTS.md` - Próximos passos após testes
- `ROADMAP_TESTING.md` - Roadmap de testes
- **Ação:** Unificar em `TESTING_ROADMAP.md` (atualizado)

#### Grupo C: Health Score
- `HEALTH_SCORE_IMPROVEMENT.md` - Melhoria de 48→71 (desatualizado)
- `PROJECT_HEALTH_IMPROVEMENTS.md` - Melhorias do projeto
- `PROGRESSO_E_CONQUISTAS.md` - Progresso e conquistas (mais atual: 79/100)
- **Ação:** Manter `PROGRESSO_E_CONQUISTAS.md` (mais completo e atual), deletar outros

#### Grupo D: Revisões do Projeto
- `PROJECT_REVIEW.md` - Revisão completa
- `PROJECT_REVIEW_2025.md` - Revisão Nov 2025
- **Ação:** Manter apenas `PROJECT_REVIEW_2025.md` (mais recente)

#### Grupo E: Próximos Passos Gerais
- `NEXT_STEPS.md` - Próximos passos gerais (antigo)
- `NEXT_STEPS_AFTER_TESTS.md` - Próximos passos após testes
- **Ação:** Consolidar informações relevantes, deletar `NEXT_STEPS.md` se duplicado

### 2. Desatualizados (Atualizar ou Deletar)

#### Arquivos com informações antigas:
- `STATUS_ATUAL_E_PROXIMOS_PASSOS.md` - Menciona Health Score 71/100 (agora 79/100)
- `HEALTH_SCORE_IMPROVEMENT.md` - Menciona 71/100 (agora 79/100)
- `NEXT_STEPS_AFTER_TESTS.md` - Menciona 20 testes (agora 35+)

### 3. Específicos/Debug (Avaliar se manter)

#### AliExpress (Múltiplos arquivos de debug):
- `ALIEXPRESS_API_FIX.md`
- `ALIEXPRESS_API_IMPROVEMENTS.md`
- `ALIEXPRESS_API_VERIFICATION.md`
- `ALIEXPRESS_DEBUG.md`
- `ALIEXPRESS_EMPTY_RESPONSE.md`
- `ALIEXPRESS_PARSING_FIX.md`
- `ALIEXPRESS_STATUS.md`
- **Ação:** Consolidar em `ALIEXPRESS_DEVELOPMENT_NOTES.md` ou mover para histórico

#### Mercado Livre (Múltiplos arquivos):
- `MERCADOLIVRE_AFFILIATE_LINKS.md`
- `MERCADOLIVRE_COLLECTION_FIX.md`
- `MERCADOLIVRE_COMPLETE.md`
- `MERCADOLIVRE_NEW_CODE.md`
- `MERCADOLIVRE_QUICK_START.md`
- `MERCADOLIVRE_SEARCH_REVIEW.md`
- `MERCADOLIVRE_SETTINGS_UI.md`
- `MERCADOLIVRE_SETUP.md`
- `MERCADOLIVRE_STATUS.md`
- `MERCADOLIVRE_TOKEN_NOW.md`
- **Ação:** Consolidar em `MERCADOLIVRE_GUIDE.md` (guia completo)

### 4. Inúteis/Obsoletos (Deletar)

- Arquivos de debug muito específicos que não agregam valor
- Arquivos temporários de troubleshooting que já foram resolvidos
- Documentação de features que não existem mais

## 📝 Plano de Ação

### Fase 1: Consolidar Duplicados

1. **Unificar Testes:**
   - Criar `TESTING_FIXES.md` (unificado)
   - Deletar: `TEST_FIXES.md`, `TEST_FIXES_APPLIED.md`, `FINAL_TEST_FIXES.md`

2. **Unificar Roadmap:**
   - Atualizar `ROADMAP_TESTING.md` com informações mais recentes
   - Deletar: `STATUS_ATUAL_E_PROXIMOS_PASSOS.md`, `NEXT_STEPS_AFTER_TESTS.md`

3. **Unificar Health Score:**
   - Manter: `PROGRESSO_E_CONQUISTAS.md` (atualizado)
   - Deletar: `HEALTH_SCORE_IMPROVEMENT.md`, `PROJECT_HEALTH_IMPROVEMENTS.md`

4. **Unificar Revisões:**
   - Manter: `PROJECT_REVIEW_2025.md`
   - Deletar: `PROJECT_REVIEW.md` (se duplicado)

### Fase 2: Consolidar Específicos

5. **Consolidar AliExpress:**
   - Criar `ALIEXPRESS_DEVELOPMENT_NOTES.md`
   - Mover informações relevantes
   - Deletar arquivos de debug específicos

6. **Consolidar Mercado Livre:**
   - Criar `MERCADOLIVRE_GUIDE.md`
   - Consolidar setup, status, fixes
   - Deletar arquivos duplicados

### Fase 3: Limpar Obsoletos

7. **Deletar arquivos obsoletos:**
   - Debug temporários resolvidos
   - Documentação de features removidas

## ✅ Arquivos a Manter (Essenciais)

### Core Documentation
- `README.md` (raiz)
- `CHANGELOG.md` (raiz)
- `SECURITY.md` (raiz)
- `POWERSHELL_GUIDE.md` (raiz) - útil para Windows

### Testing
- `TESTING_GUIDE.md` - Guia completo
- `QUICK_START_TESTING.md` - Início rápido
- `COMO_ADICIONAR_TESTES.md` - Guia em português
- `TESTING_FIXES.md` - (novo, consolidado)
- `ROADMAP_TESTING.md` - (atualizado)
- `COVERAGE_IMPROVEMENT_PLAN.md` - Plano de cobertura

### Project Status
- `PROGRESSO_E_CONQUISTAS.md` - Status atual (79/100)
- `PROJECT_REVIEW_2025.md` - Revisão recente

### Setup/Configuration
- `SETUP.md`
- `CONFIGURATION.md`
- `MONGODB_SETUP.md`
- `RULEBOOK_SETUP.md`
- `RULEBOOK_COMMANDS.md`

### Features
- `FEATURES.md`
- `ARCHITECTURE.md`
- `API.md`

### Troubleshooting
- `TROUBLESHOOTING_AUTH.md`
- `DEBUGGING.md`

## 🗑️ Arquivos a Deletar (Após Consolidar)

### Duplicados
- `TEST_FIXES.md`
- `TEST_FIXES_APPLIED.md`
- `FINAL_TEST_FIXES.md`
- `STATUS_ATUAL_E_PROXIMOS_PASSOS.md`
- `NEXT_STEPS_AFTER_TESTS.md`
- `HEALTH_SCORE_IMPROVEMENT.md`
- `PROJECT_HEALTH_IMPROVEMENTS.md`
- `PROJECT_REVIEW.md` (se duplicado)
- `NEXT_STEPS.md` (se duplicado)

### Debug Específicos (Após Consolidar)
- `ALIEXPRESS_API_FIX.md`
- `ALIEXPRESS_API_IMPROVEMENTS.md`
- `ALIEXPRESS_API_VERIFICATION.md`
- `ALIEXPRESS_DEBUG.md`
- `ALIEXPRESS_EMPTY_RESPONSE.md`
- `ALIEXPRESS_PARSING_FIX.md`
- `ALIEXPRESS_STATUS.md`
- `MERCADOLIVRE_COLLECTION_FIX.md`
- `MERCADOLIVRE_COMPLETE.md`
- `MERCADOLIVRE_NEW_CODE.md`
- `MERCADOLIVRE_SEARCH_REVIEW.md`
- `MERCADOLIVRE_SETTINGS_UI.md`
- `MERCADOLIVRE_STATUS.md`
- `MERCADOLIVRE_TOKEN_NOW.md`

## 📋 Estrutura Final Proposta

```
docs/
├── README.md (índice geral)
├── setup/
│   ├── SETUP.md
│   ├── CONFIGURATION.md
│   ├── MONGODB_SETUP.md
│   └── RULEBOOK_SETUP.md
├── testing/
│   ├── TESTING_GUIDE.md
│   ├── QUICK_START_TESTING.md
│   ├── COMO_ADICIONAR_TESTES.md
│   ├── TESTING_FIXES.md (consolidado)
│   ├── ROADMAP_TESTING.md (atualizado)
│   └── COVERAGE_IMPROVEMENT_PLAN.md
├── services/
│   ├── ALIEXPRESS_DEVELOPMENT_NOTES.md (consolidado)
│   └── MERCADOLIVRE_GUIDE.md (consolidado)
├── status/
│   ├── PROGRESSO_E_CONQUISTAS.md
│   └── PROJECT_REVIEW_2025.md
└── troubleshooting/
    ├── TROUBLESHOOTING_AUTH.md
    └── DEBUGGING.md
```

