# 📦 Guia Completo do GitHub

Este guia consolida todas as informações sobre como configurar e fazer push do projeto para o GitHub.

## 📋 Índice

1. [Preparação](#preparação)
2. [Autenticação](#autenticação)
3. [Fazer Push](#fazer-push)
4. [Troubleshooting](#troubleshooting)
5. [Segurança](#segurança)

## Preparação

### Verificações de Segurança

Antes de fazer push, verifique:

- ✅ `config.json` está no `.gitignore`
- ✅ `.env` files estão no `.gitignore`
- ✅ `config.json.example` existe (template vazio)
- ✅ Nenhuma chave de API nos arquivos `.md`
- ✅ Logs estão no `.gitignore`
- ✅ `node_modules/` está no `.gitignore`

### Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Nome do repositório: `voxelpromo` (ou outro)
3. Descrição (opcional): "Sistema de Monitoramento de Ofertas com IA"
4. Visibilidade: Público ou Privado
5. **NÃO marque**:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
   (já temos todos esses arquivos)

6. Clique em "Create repository"

## Autenticação

### Problema

O GitHub **não aceita mais senhas** para autenticação via HTTPS. É necessário usar um **Personal Access Token (PAT)**.

### Solução: Criar Personal Access Token

1. **Acesse**: https://github.com/settings/tokens
2. **Clique em**: "Generate new token" → "Generate new token (classic)"
3. **Configure**:
   - **Note**: "VoxelPromo Development"
   - **Expiration**: Escolha uma data ou "No expiration"
   - **Scopes**: Marque **`repo`** (acesso completo)
4. **Clique em**: "Generate token"
5. **Copie o token** (você só verá uma vez!)

### Configurar Remote

```bash
# Adicionar remote
git remote add origin https://github.com/rusthp/voxelpromo.git

# Ou usando SSH
git remote set-url origin git@github.com:rusthp/voxelpromo.git

# Verificar
git remote -v
```

## Fazer Push

### Primeiro Push

```bash
# Renomear branch para main (se necessário)
git branch -M main

# Fazer push
git push -u origin main
```

Quando pedir:
- **Username**: `rusthp`
- **Password**: Cole o **Personal Access Token** (não sua senha)

### Salvar Credenciais (Opcional)

Para não precisar digitar toda vez:

```bash
git config --global credential.helper store
```

Depois do primeiro push bem-sucedido, as credenciais serão salvas.

## Alternativa: Usar SSH

Se preferir SSH (mais seguro):

### 1. Gerar Chave SSH

```bash
ssh-keygen -t ed25519 -C "allyson.f.m@hotmail.com"
# Pressione Enter para aceitar local padrão
# Digite uma senha (ou deixe vazio)
```

### 2. Adicionar Chave ao GitHub

```bash
# Copiar chave pública
cat ~/.ssh/id_ed25519.pub
```

1. Acesse: https://github.com/settings/keys
2. Clique em "New SSH key"
3. Cole a chave e salve

### 3. Mudar Remote para SSH

```bash
git remote set-url origin git@github.com:rusthp/voxelpromo.git
```

### 4. Fazer Push

```bash
git push -u origin main
```

## Troubleshooting

### Erro: "Authentication failed"

**Causa**: Usando senha em vez de token

**Solução**:
- Use **Personal Access Token**, não senha
- Verifique se o token tem permissão `repo`
- Verifique se o token não expirou

### Erro: "Repository not found"

**Causa**: Repositório não existe ou sem acesso

**Solução**:
- Verifique se o repositório existe: https://github.com/rusthp/voxelpromo
- Verifique se você tem acesso
- Verifique o nome do repositório

### Erro: "Push cannot contain secrets"

**Causa**: GitHub detectou chaves de API no código

**Solução**:
- Remova todas as chaves dos arquivos
- Use placeholders: `YOUR_API_KEY_HERE`
- Limpe o histórico do Git se necessário

### Erro: "Permission denied" (SSH)

**Causa**: Chave SSH não configurada corretamente

**Solução**:
- Verifique se a chave foi adicionada ao GitHub
- Teste conexão: `ssh -T git@github.com`
- Verifique permissões: `chmod 600 ~/.ssh/id_ed25519`

## Segurança

### Após o Push

1. **Verifique no GitHub** que `config.json` não está visível
2. **Nunca commite** `config.json` mesmo que acidentalmente
3. **Use** `config.json.example` como referência

### Se Acidentalmente Commitar Credenciais

1. **IMEDIATAMENTE** revogue as credenciais comprometidas
2. **Remova do histórico** do Git:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch config.json" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push** (cuidado!):
   ```bash
   git push origin --force --all
   ```

### Boas Práticas

- ✅ Nunca commite chaves reais em arquivos de documentação
- ✅ Use placeholders como `YOUR_API_KEY_HERE`
- ✅ Mantenha `config.json` no `.gitignore`
- ✅ Use variáveis de ambiente para desenvolvimento
- ✅ Revogue chaves expostas imediatamente

## 📚 Para Novos Desenvolvedores

Quando alguém clonar o repositório:

1. **Copiar template**:
   ```bash
   cp config.json.example config.json
   ```

2. **Preencher** `config.json` com suas próprias credenciais

3. **Nunca commitar** o `config.json` preenchido

## ✅ Checklist

- [ ] Repositório criado no GitHub
- [ ] Remote configurado
- [ ] Personal Access Token criado
- [ ] Todas as chaves removidas dos arquivos
- [ ] Push realizado com sucesso
- [ ] Verificado no GitHub que não há chaves expostas




