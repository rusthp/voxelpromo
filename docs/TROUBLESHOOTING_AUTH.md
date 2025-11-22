# 🔧 Troubleshooting - Autenticação

Este guia ajuda a resolver problemas comuns ao criar conta ou fazer login.

## ❌ Erro ao Criar Conta

### Possíveis Causas e Soluções

#### 1. **"Erro de conexão. Verifique se o backend está rodando."**

**Causa:** Backend não está rodando ou não está acessível.

**Solução:**
```bash
# Verifique se o backend está rodando
npm run dev:backend

# Deve aparecer:
# Server running on port 3000
# MongoDB connected successfully
```

#### 2. **"Este email já está em uso" ou "Este username já está em uso"**

**Causa:** Email ou username já cadastrado no banco de dados.

**Solução:**
- Use um email diferente
- Use um username diferente
- Ou faça login com a conta existente

#### 3. **"Senha deve ter no mínimo 6 caracteres"**

**Causa:** Senha muito curta.

**Solução:**
- Use uma senha com pelo menos 6 caracteres

#### 4. **"Username deve ter no mínimo 3 caracteres"**

**Causa:** Username muito curto.

**Solução:**
- Use um username com pelo menos 3 caracteres

#### 5. **"Email inválido"**

**Causa:** Formato de email incorreto.

**Solução:**
- Verifique se o email está no formato correto: `usuario@dominio.com`
- Exemplo válido: `usuario@gmail.com`
- Exemplo inválido: `usuario@` ou `usuario.com`

#### 6. **"Erro no servidor. Tente novamente mais tarde."**

**Causa:** Erro interno no servidor (pode ser banco de dados, validação, etc).

**Solução:**
1. Verifique os logs do backend:
   ```bash
   # No terminal onde o backend está rodando, procure por:
   # "Registration error:"
   ```

2. Verifique se o MongoDB está rodando:
   ```bash
   # Verifique se o MongoDB está ativo
   # Windows: Verifique no Services
   # Linux/Mac: 
   sudo systemctl status mongod
   ```

3. Verifique a variável `MONGODB_URI` no `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/voxelpromo
   ```

#### 7. **"Dados inválidos. Verifique os campos preenchidos."**

**Causa:** Algum campo não passou na validação do backend.

**Solução:**
- Verifique se todos os campos estão preenchidos
- Verifique se o email está no formato correto
- Verifique se a senha tem pelo menos 6 caracteres
- Verifique se o username tem pelo menos 3 caracteres

## 🔍 Como Verificar o Erro Real

### 1. Console do Navegador

Abra o DevTools (F12) e vá na aba **Console**. Você verá o erro detalhado:

```javascript
// Exemplo de erro no console:
Auth error: Error: Este email já está em uso
```

### 2. Logs do Backend

No terminal onde o backend está rodando, procure por:

```
Registration error: ...
```

### 3. Network Tab

No DevTools, vá na aba **Network**:
1. Tente criar a conta novamente
2. Clique na requisição `register`
3. Vá na aba **Response** para ver a mensagem de erro do servidor

## ✅ Checklist de Verificação

Antes de criar uma conta, verifique:

- [ ] Backend está rodando (`npm run dev:backend`)
- [ ] MongoDB está rodando e acessível
- [ ] Email está no formato correto
- [ ] Username tem pelo menos 3 caracteres
- [ ] Senha tem pelo menos 6 caracteres
- [ ] Email/username não estão já cadastrados

## 🛠️ Solução Rápida

Se nada funcionar, tente:

1. **Reiniciar o backend:**
   ```bash
   # Pare o backend (Ctrl+C)
   # Inicie novamente
   npm run dev:backend
   ```

2. **Verificar conexão com MongoDB:**
   ```bash
   # Teste a conexão
   mongosh
   # ou
   mongo
   ```

3. **Criar usuário via script:**
   ```bash
   npm run create-admin
   ```

4. **Verificar variáveis de ambiente:**
   ```bash
   # Certifique-se de que o .env existe e tem:
   MONGODB_URI=mongodb://localhost:27017/voxelpromo
   JWT_SECRET=your-secret-key
   ```

## 📝 Mensagens de Erro Comuns

| Mensagem | Causa | Solução |
|----------|-------|---------|
| "Erro de conexão" | Backend offline | Inicie o backend |
| "Este email já está em uso" | Email duplicado | Use outro email ou faça login |
| "Este username já está em uso" | Username duplicado | Use outro username |
| "Senha deve ter no mínimo 6 caracteres" | Senha muito curta | Use senha com 6+ caracteres |
| "Email inválido" | Formato incorreto | Verifique formato do email |
| "Erro no servidor" | Erro interno | Verifique logs do backend |

## 🆘 Ainda com Problemas?

Se o problema persistir:

1. **Verifique os logs completos:**
   - Backend: Terminal onde está rodando
   - Frontend: Console do navegador (F12)

2. **Teste a API diretamente:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "teste",
       "email": "teste@example.com",
       "password": "teste123"
     }'
   ```

3. **Verifique se o MongoDB está acessível:**
   ```bash
   # Teste a conexão
   mongosh "mongodb://localhost:27017/voxelpromo"
   ```

