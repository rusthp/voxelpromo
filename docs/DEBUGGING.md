# 🐛 Guia de Debugging

Este documento explica como usar os pontos de debug (`debugger`) adicionados no código.

## 🔍 O que são Debuggers?

Os `debugger;` statements são pontos de parada no código que permitem:
- Inspecionar variáveis
- Ver o estado do código em tempo de execução
- Passo a passo (step through) do código
- Ver a pilha de chamadas (call stack)

## 🛠️ Como Usar

### Opção 1: Chrome DevTools (Frontend)

1. **Abra o Chrome DevTools**:
   - Pressione `F12` ou `Ctrl+Shift+I`
   - Ou clique com botão direito → "Inspecionar"

2. **Vá para a aba "Sources"**

3. **Ative os breakpoints**:
   - Certifique-se de que "Pause on exceptions" está desativado
   - Os `debugger;` statements pausarão automaticamente quando o código chegar neles

4. **Navegue até a página**:
   - Acesse http://localhost:3001/login
   - Tente criar uma conta
   - O código pausará nos pontos `debugger;`

5. **Use os controles**:
   - **F8**: Continuar execução
   - **F10**: Step over (próxima linha)
   - **F11**: Step into (entrar na função)
   - **Shift+F11**: Step out (sair da função)

### Opção 2: VS Code Debugger (Backend)

1. **Crie um arquivo `.vscode/launch.json`**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:backend"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

2. **Inicie o debug**:
   - Pressione `F5` ou vá em "Run and Debug"
   - Selecione "Debug Backend"
   - O código pausará nos pontos `debugger;`

3. **Use os controles**:
   - **F5**: Continuar
   - **F10**: Step over
   - **F11**: Step into
   - **Shift+F11**: Step out

### Opção 3: Node.js Inspector (Backend)

1. **Inicie o backend com inspector**:
```bash
node --inspect -r ts-node/register src/server.ts
```

2. **Abra Chrome** e acesse: `chrome://inspect`

3. **Clique em "inspect"** no processo Node.js

4. **Use o DevTools** como no frontend

## 📍 Pontos de Debug Adicionados

### Backend

#### Autenticação (`src/routes/auth.routes.ts`)
- ✅ **Registro de usuário**: Quando uma requisição de registro chega
- ✅ **Verificação de usuário existente**: Antes de verificar duplicatas
- ✅ **Usuário já existe**: Se o usuário/email já está cadastrado
- ✅ **Usuário salvo**: Após salvar o usuário no banco
- ✅ **Geração de token**: Antes de gerar o JWT

#### Middleware (`src/middleware/auth.ts`)
- ✅ **Início da autenticação**: Quando o middleware é chamado
- ✅ **Verificação de token**: Antes de verificar o JWT
- ✅ **Busca de usuário**: Antes de buscar no banco
- ✅ **Usuário anexado**: Após anexar o usuário à requisição

#### Configuração (`src/routes/config.routes.ts`)
- ✅ **Salvar configuração**: Quando uma configuração é salva
- ✅ **Corpo da requisição**: Se o body está presente
- ✅ **Config recebida**: Após receber os dados

#### Coletor (`src/services/collector/CollectorService.ts`)
- ✅ **Início da coleta**: Quando a coleta de ofertas começa

### Frontend

#### Contexto de Autenticação (`frontend/contexts/AuthContext.tsx`)
- ✅ **Função register chamada**: Quando o registro é iniciado
- ✅ **Resposta da API recebida**: Após receber resposta do backend
- ✅ **Registro bem-sucedido**: Se o registro foi bem-sucedido
- ✅ **Registro falhou**: Se o registro falhou
- ✅ **Erro capturado**: Quando um erro é capturado

#### Página de Login (`frontend/app/login/page.tsx`)
- ✅ **Formulário enviado**: Quando o formulário é submetido
- ✅ **Modo login**: Se está em modo de login
- ✅ **Modo registro**: Se está em modo de registro
- ✅ **Validação falhou**: Se a validação falhou
- ✅ **Chamada de registro**: Antes de chamar a função register
- ✅ **Registro completado**: Após o registro ser completado
- ✅ **Erro no handleSubmit**: Quando um erro ocorre

## 🎯 Casos de Uso

### Debug de Registro de Usuário

1. **Abra o DevTools** (F12)
2. **Vá para Sources**
3. **Acesse** http://localhost:3001/login
4. **Preencha o formulário** e clique em "Criar Conta"
5. **O código pausará** no primeiro `debugger;` (handleSubmit)
6. **Inspecione as variáveis**:
   - `username`
   - `email`
   - `password`
7. **Continue** (F8) para o próximo ponto
8. **Veja a requisição** sendo enviada
9. **Veja a resposta** do backend

### Debug de Autenticação

1. **Configure o VS Code** com `.vscode/launch.json`
2. **Inicie o debug** (F5)
3. **Faça uma requisição** que requer autenticação
4. **O código pausará** no middleware de autenticação
5. **Inspecione**:
   - `authHeader`
   - `token`
   - `decoded`
   - `user`

### Debug de Erros

1. **Ative "Pause on exceptions"** no DevTools
2. **Tente uma ação** que cause erro
3. **O código pausará** no ponto do erro
4. **Veja a pilha de chamadas** (Call Stack)
5. **Inspecione as variáveis** no momento do erro

## 💡 Dicas

### Desabilitar Debuggers Temporariamente

Se você não quiser que os debuggers parem o código:

**Chrome DevTools**:
- Desative "Pause on exceptions"
- Os `debugger;` serão ignorados se o DevTools não estiver aberto

**VS Code**:
- Comente os `debugger;` statements
- Ou use a configuração `"skipFiles"` no `launch.json`

### Adicionar Mais Debuggers

Para adicionar mais pontos de debug:

```typescript
// Em qualquer lugar do código
debugger; // Debug: Descrição do que está sendo debugado
```

### Logs vs Debuggers

- **`console.log()`**: Mostra informações no console, não pausa
- **`debugger;`**: Pausa a execução, permite inspecionar tudo

Use `debugger;` quando precisar:
- Ver o estado de múltiplas variáveis
- Entender o fluxo de execução
- Encontrar bugs complexos

Use `console.log()` quando precisar:
- Logs rápidos
- Informações que não precisam de pausa
- Logs em produção (remova antes de deploy)

## 🔧 Troubleshooting

### Debugger não pausa

**Causa**: DevTools não está aberto ou não está na aba correta

**Solução**: 
- Abra o DevTools antes de executar o código
- Certifique-se de estar na aba "Sources"

### VS Code não conecta

**Causa**: Configuração incorreta do `launch.json`

**Solução**:
- Verifique se o arquivo está em `.vscode/launch.json`
- Verifique se o `runtimeExecutable` está correto
- Reinicie o VS Code

### Backend não pausa

**Causa**: Node.js não está rodando com inspector

**Solução**:
- Use `node --inspect` ou configure o VS Code
- Verifique se a porta 9229 está livre

## 📚 Recursos

- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Node.js Inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/)

