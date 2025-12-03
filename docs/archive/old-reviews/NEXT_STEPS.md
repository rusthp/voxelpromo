# 🎯 Próximos Passos - VoxelPromo

## ✅ Recém Concluído

- **Correção do salvamento de configurações**: Problema de configurações não sendo salvas foi corrigido
  - Frontend: Melhorado handler de salvamento e validação
  - Backend: Melhorada lógica de preservação de valores
  - Documentação: Criado `SETTINGS_SAVE_FIX.md`

## 🔥 Prioridade Alta (Fazer Agora)

### 1. Testar a Correção de Salvamento ⚠️
**Status**: Pendente  
**Tempo estimado**: 15 minutos

**Ações**:
- [ ] Abrir página de configurações
- [ ] Inserir novo Bot Token do Telegram
- [ ] Salvar e verificar mensagem de sucesso
- [ ] Recarregar página e confirmar que token foi salvo
- [ ] Testar com Groq API Key
- [ ] Testar preservação de valores existentes (deixar campo vazio)

**Critério de sucesso**: Todos os valores são salvos e persistidos corretamente

---

### 2. Remover Debugger Statements 🧹
**Status**: Pendente  
**Tempo estimado**: 10 minutos

**Arquivos afetados**:
- `src/routes/config.routes.ts` (linhas 79, 81, 85, 191, 193)
- `src/routes/auth.routes.ts` (várias linhas)
- `src/middleware/auth.ts` (várias linhas)
- `src/services/collector/CollectorService.ts` (linha 102)

**Ações**:
- [ ] Remover todos os `debugger;` statements
- [ ] Substituir por logs apropriados usando `logger` quando necessário
- [ ] Verificar que não há mais debuggers no código

**Critério de sucesso**: Nenhum `debugger` statement no código de produção

---

### 3. Melhorar Validação de Inputs 📝
**Status**: Pendente  
**Tempo estimado**: 30 minutos

**Validações a adicionar**:
- [ ] **Telegram Bot Token**: Formato `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` (número:hash)
- [ ] **Telegram Chat ID**: Apenas números (pode ser negativo para grupos)
- [ ] **Groq API Key**: Deve começar com `gsk_`
- [ ] **OpenAI API Key**: Deve começar com `sk-`
- [ ] **Amazon Associate Tag**: Formato válido
- [ ] **URLs RSS**: Formato de URL válido
- [ ] **WhatsApp Number**: Formato internacional válido

**Implementação**:
- Adicionar validação em tempo real nos campos
- Mostrar mensagens de erro inline
- Desabilitar botão de salvar se houver erros

**Critério de sucesso**: Todos os campos têm validação apropriada com feedback visual

---

## 📊 Prioridade Média (Fazer Em Breve)

### 4. Melhorar Feedback Visual 🎨
**Status**: Pendente  
**Tempo estimado**: 45 minutos

**Melhorias**:
- [ ] Substituir `alert()` por toast notifications
- [ ] Adicionar indicadores visuais de sucesso/erro
- [ ] Mostrar loading states mais claros
- [ ] Adicionar animações suaves para transições

**Biblioteca sugerida**: `react-hot-toast` ou `sonner`

**Critério de sucesso**: Interface mais polida e profissional, sem alerts nativos

---

### 5. Adicionar Health Check Endpoint 🏥
**Status**: Pendente  
**Tempo estimado**: 20 minutos

**Endpoint**: `GET /api/health`

**Resposta**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "telegram": "configured",
    "ai": "configured"
  },
  "uptime": 3600
}
```

**Uso**: Monitoramento, CI/CD, load balancers

**Critério de sucesso**: Endpoint retorna status correto de todos os serviços

---

### 6. Validação de Formato de Tokens 🔐
**Status**: Pendente  
**Tempo estimado**: 25 minutos

**Validações específicas**:
- [ ] Telegram Bot Token: Regex para formato `\d+:[A-Za-z0-9_-]+`
- [ ] Chat ID: Regex para números (positivos ou negativos)
- [ ] Groq API Key: Regex para `gsk_[A-Za-z0-9]+`
- [ ] OpenAI API Key: Regex para `sk-[A-Za-z0-9]+`

**Implementação**:
- Criar arquivo `src/utils/validators.ts`
- Adicionar funções de validação reutilizáveis
- Usar no frontend e backend

**Critério de sucesso**: Tokens inválidos são rejeitados antes de salvar

---

## 🔮 Prioridade Baixa (Nice to Have)

### 7. Adicionar Testes Unitários 🧪
**Status**: Pendente  
**Tempo estimado**: 2-3 horas

**Cobertura inicial**:
- [ ] Testes para `config.routes.ts`
- [ ] Testes para validadores
- [ ] Testes para serviços principais

**Ferramentas**: Jest + Supertest

---

### 8. Melhorar Tratamento de Erros 🛡️
**Status**: Pendente  
**Tempo estimado**: 1 hora

**Melhorias**:
- [ ] Error boundaries no frontend
- [ ] Mensagens de erro mais amigáveis
- [ ] Logging estruturado de erros
- [ ] Retry logic para requisições falhadas

---

### 9. Adicionar Rate Limiting 🚦
**Status**: Pendente  
**Tempo estimado**: 30 minutos

**Implementação**:
- [ ] Rate limiting nas rotas de API
- [ ] Proteção contra spam
- [ ] Configuração por rota

**Biblioteca**: `express-rate-limit`

---

## 📋 Checklist Rápido

Use este checklist para acompanhar o progresso:

```
[ ] 1. Testar correção de salvamento
[ ] 2. Remover debugger statements
[ ] 3. Adicionar validação de inputs
[ ] 4. Melhorar feedback visual
[ ] 5. Adicionar health check
[ ] 6. Validação de formato de tokens
```

## 🎯 Meta Semanal

**Esta semana**: Completar itens 1-3 (Prioridade Alta)
**Próxima semana**: Completar itens 4-6 (Prioridade Média)

## 📚 Documentação Relacionada

- [Settings Save Fix](./SETTINGS_SAVE_FIX.md) - Detalhes da correção recente
- [Project Checklist](./PROJECT_CHECKLIST.md) - Checklist completo do projeto
- [Setup Guide](./SETUP.md) - Guia de configuração

## 🔗 Links Úteis

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Groq API Docs](https://console.groq.com/docs)
- [React Hot Toast](https://react-hot-toast.com/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)

---

**Última atualização**: 2025-01-15

