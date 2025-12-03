# ✅ Sistema de Validação

**VoxelPromo** utiliza validação em tempo real para garantir qualidade dos dados e melhorar UX.

---

## 📦 Localização

**Validadores**: `frontend/lib/validators.ts` (Frontend) e `src/utils/validators.ts` (Backend)  
**Implementação**: `frontend/app/settings/page.tsx`

---

## 🎯 Validadores Disponíveis

### 1. Telegram

#### `validateTelegramBotToken(token: string)`
Valida token do bot Telegram.

**Formato esperado**: `123456789:ABCdefGHI-jklMNO_pqr`

```typescript
import { validateTelegramBotToken } from '@/lib/validators'

const result = validateTelegramBotToken('123456789:ABCdef')
if (!result.isValid) {
  console.error(result.error) // "Invalid Telegram bot token format..."
}
```

**Regex**: `/^\d+:[A-Za-z0-9_-]+$/`

---

#### `validateTelegramChatId(chatId: string)`
Valida Chat ID (positivo ou negativo para grupos).

**Formato**: Apenas números, pode iniciar com `-`

```typescript
validateTelegramChatId('123456789')      // ✅ válido
validateTelegramChatId('-1001234567890') // ✅ válido (grupo)
validateTelegramChatId('abc123')         // ❌ inválido
```

**Regex**: `/^-?\d+$/`

---

### 2. IA (APIs)

#### `validateGroqApiKey(apiKey: string)`
Valida chave da API Groq.

**Formato**: Deve começar com `gsk_` e ter no mínimo 20 caracteres

```typescript
validateGroqApiKey('gsk_1234567890abcdefghij') // ✅
validateGroqApiKey('sk_123')                   // ❌ prefixo errado
validateGroqApiKey('gsk_123')                  // ❌ muito curto
```

---

#### `validateOpenAIApiKey(apiKey: string)`
Valida chave da API OpenAI.

**Formato**: Deve começar com `sk-` e ter no mínimo 20 caracteres

```typescript
validateOpenAIApiKey('sk-1234567890abcdefghij') // ✅
validateOpenAIApiKey('gsk_123')                 // ❌ prefixo errado
```

---

### 3. URLs

#### `validateUrl(url: string)`
Valida URL genérica (HTTP/HTTPS only).

```typescript
validateUrl('https://example.com')      // ✅
validateUrl('http://localhost:3000')    // ✅
validateUrl('ftp://example.com')        // ❌ protocolo não permitido
validateUrl('example.com')              // ❌ sem protocolo
```

---

#### `validateRssFeedUrl(url: string)`
Alias de `validateUrl()` para feeds RSS.

---

### 4. Contato

#### `validateWhatsAppPhoneNumber(phoneNumber: string)`
Valida número WhatsApp (formato internacional).

**Formato**: 10-15 dígitos (caracteres especiais são removidos)

```typescript
validateWhatsAppPhoneNumber('5511999999999')      // ✅
validateWhatsAppPhoneNumber('+55 11 99999-9999') // ✅ (formatação removida)
validateWhatsAppPhoneNumber('123')                // ❌ muito curto
validateWhatsAppPhoneNumber('12345678901234567') // ❌ muito longo
```

---

#### `validateEmail(email: string)`
Valida endereço de email.

```typescript
validateEmail('user@example.com')     // ✅
validateEmail('user@mail.example.com') // ✅
validateEmail('invalid')              // ❌
validateEmail('user@')                // ❌
```

**Regex**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

---

### 5. Amazon

#### `validateAmazonAssociateTag(tag: string)`
Valida Amazon Associate Tag.

**Formato**: Alfanumérico, hífens e underscores

```typescript
validateAmazonAssociateTag('mysite-20')   // ✅
validateAmazonAssociateTag('my_site-21')  // ✅
validateAmazonAssociateTag('my@site')     // ❌ caractere inválido
```

**Regex**: `/^[a-zA-Z0-9_-]+$/`

---

### 6. Genérico

#### `validateNonEmpty(value: string, fieldName?: string)`
Valida que string não está vazia.

```typescript
validateNonEmpty('hello', 'Nome')  // ✅
validateNonEmpty('', 'Nome')       // ❌ "Nome is required"
validateNonEmpty('   ')            // ❌ "Field is required"
```

---

## 🎨 Validação em Tempo Real

Exemplo de implementação em `settings/page.tsx`:

```typescript
const [config, setConfig] = useState({})
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

const updateConfig = (section: string, field: string, value: any) => {
  // Atualizar config
  setConfig(prev => ({
    ...prev,
    [section]: { ...prev[section], [field]: value }
  }))

  // Validar em tempo real
  const fieldKey = `${section}.${field}`
  
  if (!value || value.trim().length === 0) {
    // Limpar erro se vazio
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
    return
  }

  // Aplicar validador apropriado
  let validation = null
  if (section === 'telegram' && field === 'botToken') {
    validation = validateTelegramBotToken(value)
  }

  // Atualizar erros
  if (validation && !validation.isValid) {
    setValidationErrors(prev => ({
      ...prev,
      [fieldKey]: validation.error
    }))
  } else {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
  }
}
```

---

## 🎨 Feedback Visual

### Bordas Coloridas

```typescript
<input
  className={`
    ${validationErrors['telegram.botToken']
      ? 'border-red-500'      // ❌ Erro
      : config.telegram?.botToken
        ? 'border-green-500'  // ✅ Válido
        : 'border-gray-300'   // ⚪ Neutro
    }
  `}
/>
```

### Mensagens Inline

```typescript
{validationErrors['telegram.botToken'] && (
  <div className="text-red-600 text-sm mt-1">
    <XCircle className="w-4 h-4" />
    {validationErrors['telegram.botToken']}
  </div>
)}

{!validationErrors['telegram.botToken'] && config.telegram?.botToken && (
  <div className="text-green-600 text-sm mt-1">
    <CheckCircle2 className="w-4 h-4" />
    Formato válido
  </div>
)}
```

### Botão Desabilitado

```typescript
<button
  disabled={Object.keys(validationErrors).length > 0}
  title={Object.keys(validationErrors).length > 0 
    ? `${Object.keys(validationErrors).length} erro(s)` 
    : ''
  }
>
  {Object.keys(validationErrors).length > 0 
    ? `${Object.keys(validationErrors).length} Erro(s) - Corrija para Salvar`
    : 'Salvar'
  }
</button>
```

---

## ✅ Best Practices

### 1. Validar no onChange
```typescript
<input
  value={token}
  onChange={(e) => updateConfig('telegram', 'botToken', e.target.value)}
/>
```

### 2. Sempre fazer trim()
```typescript
const validation = validateTelegramBotToken(value.trim())
```

### 3. Limpar erro quando vazio
Campos vazios não devem mostrar erro, apenas quando preenchidos incorretamente.

### 4. Feedback visual claro
- 🔴 Vermelho = erro
- 🟢 Verde = sucesso
- ⚪ Cinza = neutro

### 5. Desabilitar submit com erros
```typescript
disabled={saving || Object.keys(validationErrors).length > 0}
```

---

## 🧪 Testes

Localização: `src/utils/__tests__/validators.test.ts` e `frontend/lib/__tests__/validators.test.ts`

**Cobertura**: 80+ casos de teste, 95%+ de cobertura

```bash
npm test validators
```

---

## 🔗 Ver Também

- [Sistema de Toasts](TOAST_SYSTEM.md)
- [Código: `frontend/lib/validators.ts`](file:///b:/voxelpromo/frontend/lib/validators.ts)
- [Código: `src/utils/validators.ts`](file:///b:/voxelpromo/src/utils/validators.ts)
- [Implementação: `settings/page.tsx`](file:///b:/voxelpromo/frontend/app/settings/page.tsx#L608-L659)
