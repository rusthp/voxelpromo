# 🚀 Instruções para Push no GitHub

## ⚠️ Problema de Autenticação

O GitHub **não aceita mais senhas** para autenticação via HTTPS. Você precisa usar um **Personal Access Token (PAT)**.

## 📝 Passo a Passo

### 1. Criar Personal Access Token

1. Acesse: **https://github.com/settings/tokens**
2. Clique em: **"Generate new token"** → **"Generate new token (classic)"**
3. Configure:
   - **Note**: "VoxelPromo Development"
   - **Expiration**: Escolha uma data ou "No expiration"
   - **Scopes**: Marque **`repo`** (acesso completo)
4. Clique em: **"Generate token"**
5. **Copie o token** (você só verá uma vez!)

### 2. Fazer Push

Execute:
```bash
git push -u origin main
```

Quando pedir:
- **Username**: `rusthp`
- **Password**: Cole o **Personal Access Token** (não sua senha do GitHub)

### 3. Salvar Credenciais (Opcional)

Para não precisar digitar toda vez:

```bash
git config --global credential.helper store
```

Depois do primeiro push bem-sucedido, as credenciais serão salvas.

## 🔄 Alternativa: Usar SSH

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

1. Acesse: **https://github.com/settings/keys**
2. Clique em: **"New SSH key"**
3. Cole a chave e salve

### 3. Mudar Remote para SSH
```bash
git remote set-url origin git@github.com:rusthp/voxelpromo.git
```

### 4. Fazer Push
```bash
git push -u origin main
```

## ✅ Verificação

Após o push bem-sucedido, verifique:
- Acesse: **https://github.com/rusthp/voxelpromo**
- Todos os arquivos devem estar lá
- `config.json` **NÃO** deve estar visível (está no .gitignore)

## 🆘 Troubleshooting

### Erro: "Authentication failed"
- ✅ Use **Personal Access Token**, não senha
- ✅ Verifique se o token tem permissão `repo`
- ✅ Verifique se o token não expirou

### Erro: "Repository not found"
- ✅ Verifique se o repositório existe: https://github.com/rusthp/voxelpromo
- ✅ Verifique se você tem acesso ao repositório

### Esqueceu o Token
- Acesse: https://github.com/settings/tokens
- Revogue o token antigo
- Crie um novo token

