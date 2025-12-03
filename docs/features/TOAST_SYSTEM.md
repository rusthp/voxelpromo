# 🎨 Sistema de Toast Notifications

**VoxelPromo** utiliza `react-hot-toast` com funções wrapper customizadas para feedback profissional ao usuário.

---

## 📦 Localização

**Biblioteca**: `react-hot-toast`  
**Wrapper**: `frontend/lib/toast.ts`  
**Provider**: `frontend/app/layout.tsx` (`<Toaster />`)

---

## 🎯 Funções Disponíveis

### `showSuccess(message: string)`
Exibe toast verde de sucesso com ícone ✅

**Uso**:
```typescript
import { showSuccess } from '@/lib/toast'

await api.post('/offers', data)
showSuccess('✅ Oferta criada com sucesso!')
```

---

### `showError(message: string)`
Exibe toast vermelho de erro com ícone ❌

**Uso**:
```typescript
import { showError } from '@/lib/toast'

try {
  await api.delete(`/offers/${id}`)
} catch (error) {
  showError(`❌ Erro ao deletar: ${error.message}`)
}
```

---

### `showWarning(message: string)`
Exibe toast amarelo de aviso com ícone ⚠️

**Uso**:
```typescript
import { showWarning } from '@/lib/toast'

if (!selectedIds.length) {
  showWarning('⚠️ Selecione pelo menos uma oferta')
  return
}
```

---

### `showInfo(message: string)`
Exibe toast azul informativo com ícone ℹ️

**Uso**:
```typescript
import { showInfo } from '@/lib/toast'

showInfo('ℹ️ Automação pausada. Clique em "Iniciar" para retomar.')
```

---

### `showLoading(message: string)`
Exibe toast de loading com spinner

**Uso**:
```typescript
import { showLoading, dismissToast } from '@/lib/toast'

const toastId = showLoading('⏳ Processando...')
await longRunningTask()
dismissToast(toastId)
showSuccess('✅ Concluído!')
```

---

### `dismissToast(toastId?: string)`
Remove um toast específico ou todos

**Uso**:
```typescript
// Remover toast específico
dismissToast(toastId)

// Remover todos
dismissToast()
```

---

## 🎨 Configuração

Em `frontend/app/layout.tsx`:

```typescript
import { Toaster } from 'react-hot-toast'

export default function RootLayout() {
  return (
    <html>
      <body>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}
```

---

## ✅ Best Practices

### 1. Use Emojis Consistentes
```typescript
✅ showSuccess('✅ Salvo!')
❌ showError('❌ Falha!')
⚠️ showWarning('⚠️ Atenção!')
ℹ️ showInfo('ℹ️ Info')
```

### 2. Mensagens Curtas e Claras
```typescript
// ✅ Bom
showSuccess('Template criado!')

// ❌ Evitar
showSuccess('O template foi criado com sucesso no banco de dados e agora está disponível para uso')
```

### 3. Contexto nos Erros
```typescript
// ✅ Bom
showError(`Erro ao salvar: ${error.response?.data?.error || error.message}`)

// ❌ Evitar
showError('Erro')
```

### 4. Não Bloquear UI
Os toasts **não** bloqueiam a interface. Para confirmações, use modais ou `confirm()`.

```typescript
// Para confirmações
if (!confirm('Tem certeza?')) return

// Para feedback
showSuccess('Deletado!')
```

### 5. Loading States
Use `showLoading()` para operações demoradas (> 1s):

```typescript
const toastId = showLoading('Salvando configurações...')
try {
  await api.post('/config', data)
  dismissToast(toastId)
  showSuccess('Salvo!')
} catch (error) {
  dismissToast(toastId)
  showError(`Erro: ${error.message}`)
}
```

---

## 🚫 O Que NÃO Fazer

### ❌ Não usar `alert()`
```typescript
// ❌ NUNCA
alert('Salvo com sucesso!')

// ✅ SEMPRE
showSuccess('✅ Salvo com sucesso!')
```

### ❌ Não usar `console.log()` para feedback
```typescript
// ❌ Usuário não vê
console.log('Oferta criada')

// ✅ Feedback visual
showSuccess('Oferta criada!')
```

### ❌ Não encadear múltiplos toasts rapidamente
```typescript
// ❌ Poluição visual
showInfo('Iniciando...')
showInfo('Processando...')
showInfo('Quase lá...')
showSuccess('Pronto!')

// ✅ Um loading + um sucesso
const id = showLoading('Processando...')
await process()
dismissToast(id)
showSuccess('Pronto!')
```

---

## 📊 Estatísticas de Uso

**Migração Completa**: 36/36 alerts substituídos por toasts

| Arquivo | Toasts |
|---------|--------|
| OffersListWithFilters.tsx | 11 |
| automation/page.tsx | 7 |
| templates/page.tsx | 7 |
| OffersList.tsx | 6 |
| blacklist/page.tsx | 4 |
| settings/page.tsx | 1 |

---

## 🎯 Quando Usar Cada Tipo

| Tipo | Quando Usar | Exemplo |
|------|-------------|---------|
| `showSuccess` | Operação concluída | Salvo, criado, deletado |
| `showError` | Erro/falha | API falhou, validação falhou |
| `showWarning` | Aviso/validação | Campo vazio, limite atingido |
| `showInfo` | Informação neutra | Status, preview, dica |
| `showLoading` | Operação em progresso | Salvando, carregando |

---

## 🔗 Ver Também

- [Validação em Tempo Real](VALIDATION.md)
- [react-hot-toast Docs](https://react-hot-toast.com/)
- [Código: `frontend/lib/toast.ts`](file:///b:/voxelpromo/frontend/lib/toast.ts)
