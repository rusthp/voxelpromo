# ✅ Correção: Callback URL para X (Twitter) OAuth 2.0

## ⚠️ Problema

O Twitter Developer Portal estava rejeitando o callback URL:
```
https://proplaynews.com.br/api/x/auth/callback
```

**Erro**: "Invalid callback url. Please check the characters used."

## 🔍 Causa

O Twitter pode ter restrições com URLs que contêm `/api/` no caminho ou caminhos muito longos. A documentação do Twitter sugere usar URLs mais simples.

## ✅ Solução Implementada

Criada uma rota alternativa mais simples que redireciona para o callback real:

### Nova Rota
```
https://proplaynews.com.br/x-callback
```

Esta rota redireciona automaticamente para `/api/x/auth/callback` preservando todos os parâmetros de query do OAuth.

### Configuração Atualizada

**config.json**:
```json
{
  "x": {
    "oauth2RedirectUri": "https://proplaynews.com.br/x-callback"
  }
}
```

## 📋 Passos para Configurar

### 1. No Twitter Developer Portal

1. Acesse: https://developer.twitter.com/en/portal/dashboard
2. Selecione seu app
3. Vá em **"Settings"** → **"User authentication settings"**
4. Configure **"Callback URI / Redirect URL"** como:
   ```
   https://proplaynews.com.br/x-callback
   ```
5. **Salve** as alterações

### 2. Verificar config.json

Certifique-se de que o `oauth2RedirectUri` está como:
```json
"oauth2RedirectUri": "https://proplaynews.com.br/x-callback"
```

### 3. Testar

1. Reinicie o servidor backend
2. Recarregue a página de configurações
3. Clique em **"🔗 Conectar com X (Twitter)"**
4. A URL deve abrir corretamente
5. Após autorizar, você será redirecionado para `/x-callback` que automaticamente redireciona para o handler

## 🔧 Como Funciona

```
1. Usuário autoriza no Twitter
2. Twitter redireciona para: https://proplaynews.com.br/x-callback?code=...&state=...
3. Rota /x-callback recebe a requisição
4. Redireciona para: /api/x/auth/callback?code=...&state=...
5. Handler OAuth processa o código e troca por token
```

## ✅ Vantagens

- ✅ URL mais simples (sem `/api/`)
- ✅ Aceito pelo Twitter Developer Portal
- ✅ Funcionalidade preservada (redireciona para handler real)
- ✅ Todos os parâmetros de query preservados

## 🔍 Alternativas (se ainda não funcionar)

Se o Twitter ainda rejeitar, tente estas alternativas:

1. **URL ainda mais simples**:
   ```
   https://proplaynews.com.br/twitter-callback
   ```

2. **Sem hífen**:
   ```
   https://proplaynews.com.br/xcallback
   ```

3. **Caminho diferente**:
   ```
   https://proplaynews.com.br/auth/twitter
   ```

Para usar uma alternativa, atualize:
- `config.json`: `oauth2RedirectUri`
- `src/routes/index.ts`: Rota `/x-callback` (mude o caminho)
- Twitter Developer Portal: Callback URL

---

**Última atualização**: 2025-01-17


