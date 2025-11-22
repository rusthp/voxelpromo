# 📦 Setup do Projeto no GitHub

## ✅ Verificações de Segurança Realizadas

### Arquivos Protegidos (NÃO serão commitados)

O seguinte arquivo contém informações sensíveis e está no `.gitignore`:
- ✅ `config.json` - Contém todos os tokens, API keys e credenciais

### Arquivos de Exemplo Criados

- ✅ `config.json.example` - Template com valores vazios para referência

## 📋 Checklist Antes do Push

### ✅ Verificado
- [x] `config.json` está no `.gitignore`
- [x] `.env` files estão no `.gitignore`
- [x] `config.json.example` criado com valores vazios
- [x] Logs estão no `.gitignore`
- [x] Node modules estão no `.gitignore`
- [x] Build outputs estão no `.gitignore`
- [x] Coverage reports estão no `.gitignore`

### ⚠️ Importante
- [ ] **Ofertas no MongoDB**: As ofertas coletadas estão no banco de dados MongoDB, não em arquivos. O banco de dados não será commitado.
- [ ] **Credenciais**: Todas as credenciais estão em `config.json` que está protegido pelo `.gitignore`

## 🚀 Como Fazer Push para o GitHub

### 1. Criar Repositório no GitHub

1. Acesse https://github.com/new
2. Crie um novo repositório (ex: `voxelpromo`)
3. **NÃO** inicialize com README, .gitignore ou license (já temos)

### 2. Adicionar Remote e Fazer Push

```bash
# Adicionar remote (substitua USERNAME pelo seu usuário GitHub)
git remote add origin https://github.com/USERNAME/voxelpromo.git

# Ou usando SSH
git remote add origin git@github.com:USERNAME/voxelpromo.git

# Renomear branch para main (se necessário)
git branch -M main

# Fazer push inicial
git push -u origin main
```

### 3. Verificar o que será commitado

```bash
# Ver todos os arquivos que serão commitados
git status

# Ver arquivos ignorados (não serão commitados)
git status --ignored
```

## 📝 Arquivos que SERÃO Commitados

- ✅ Código fonte (`src/`, `frontend/`)
- ✅ Documentação (`docs/`)
- ✅ Configurações de projeto (`package.json`, `tsconfig.json`, etc)
- ✅ `config.json.example` (template vazio)
- ✅ `.gitignore`
- ✅ `README.md`
- ✅ Scripts de desenvolvimento (`scripts/`)

## 🚫 Arquivos que NÃO SERÃO Commitados

- ❌ `config.json` (contém credenciais)
- ❌ `.env` files
- ❌ `node_modules/`
- ❌ `logs/`
- ❌ `coverage/`
- ❌ `dist/` e `build/`
- ❌ Arquivos temporários

## 🔒 Segurança

### Após o Push

1. **Verifique no GitHub** que `config.json` não está visível
2. **Nunca commite** `config.json` mesmo que acidentalmente
3. **Use** `config.json.example` como referência para outros desenvolvedores

### Se Acidentalmente Commitar Credenciais

Se você acidentalmente commitar credenciais:

1. **IMEDIATAMENTE** revogue as credenciais comprometidas
2. Remova do histórico do Git:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch config.json" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (cuidado!):
   ```bash
   git push origin --force --all
   ```

## 📚 Para Novos Desenvolvedores

Quando alguém clonar o repositório:

1. Copie `config.json.example` para `config.json`:
   ```bash
   cp config.json.example config.json
   ```

2. Preencha `config.json` com suas próprias credenciais

3. Nunca commite o `config.json` preenchido

## ✅ Status Atual

- ✅ Repositório Git inicializado
- ✅ `.gitignore` configurado corretamente
- ✅ `config.json.example` criado
- ✅ Pronto para commit inicial
- ⏳ Aguardando push para GitHub

