# 🔐 Autenticação GitHub

## Problema

O GitHub não aceita mais senhas para autenticação via HTTPS. É necessário usar um **Personal Access Token (PAT)**.

## Solução: Usar Personal Access Token

### Opção 1: Criar um Personal Access Token (Recomendado)

1. **Acesse**: https://github.com/settings/tokens
2. **Clique em**: "Generate new token" → "Generate new token (classic)"
3. **Configure o token**:
   - **Note**: "VoxelPromo - Local Development"
   - **Expiration**: Escolha uma data (ou "No expiration")
   - **Scopes**: Marque pelo menos:
     - ✅ `repo` (acesso completo aos repositórios)
4. **Clique em**: "Generate token"
5. **Copie o token** (você só verá uma vez!)

### Opção 2: Usar o Token no Push

Quando fizer push, use:
- **Username**: `rusthp` (ou seu email)
- **Password**: Cole o **Personal Access Token** (não sua senha)

```bash
git push -u origin main
# Username: rusthp
# Password: [cole o token aqui]
```

### Opção 3: Configurar Credencial Helper (Mais Conveniente)

Para não precisar digitar o token toda vez:

```bash
# Configurar para salvar credenciais
git config --global credential.helper store

# Ou usar cache (temporário)
git config --global credential.helper cache
```

Depois do primeiro push bem-sucedido, as credenciais serão salvas.

### Opção 4: Usar SSH (Alternativa)

Se preferir usar SSH em vez de HTTPS:

1. **Gerar chave SSH** (se ainda não tiver):
   ```bash
   ssh-keygen -t ed25519 -C "allyson.f.m@hotmail.com"
   ```

2. **Adicionar chave ao GitHub**:
   - Copie a chave pública: `cat ~/.ssh/id_ed25519.pub`
   - Acesse: https://github.com/settings/keys
   - Clique em "New SSH key"
   - Cole a chave e salve

3. **Mudar remote para SSH**:
   ```bash
   git remote set-url origin git@github.com:rusthp/voxelpromo.git
   ```

4. **Fazer push**:
   ```bash
   git push -u origin main
   ```

## Comandos Rápidos

### Verificar Remote Atual
```bash
git remote -v
```

### Mudar para HTTPS com Token
```bash
git remote set-url origin https://github.com/rusthp/voxelpromo.git
```

### Mudar para SSH
```bash
git remote set-url origin git@github.com:rusthp/voxelpromo.git
```

## Troubleshooting

### Erro: "Authentication failed"
- ✅ Verifique se está usando um **Personal Access Token**, não sua senha
- ✅ Verifique se o token tem permissão `repo`
- ✅ Verifique se o token não expirou

### Erro: "Permission denied"
- ✅ Verifique se você tem acesso ao repositório
- ✅ Verifique se o repositório existe no GitHub

### Esqueceu o Token
- Acesse: https://github.com/settings/tokens
- Revogue o token antigo
- Crie um novo token

## Segurança

⚠️ **IMPORTANTE**:
- Nunca commite tokens no código
- Tokens estão no `.gitignore`
- Se um token for exposto, revogue imediatamente
- Use tokens com escopo mínimo necessário

