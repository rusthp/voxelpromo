# 📁 Next.js App Directory - Explicação

## O que é "app"?

No contexto do Next.js 13+, **"app"** se refere ao **App Router** (novo sistema de roteamento do Next.js).

### Estrutura de Pastas

```
frontend/
├── app/              ← Diretório "app" (App Router)
│   ├── layout.tsx    ← Layout principal (envolve todas as páginas)
│   ├── page.tsx      ← Página inicial (/)
│   ├── login/
│   │   └── page.tsx  ← Página de login (/login)
│   └── settings/
│       └── page.tsx ← Página de configurações (/settings)
```

### O que é cada arquivo?

1. **`app/layout.tsx`**: 
   - Layout principal que envolve todas as páginas
   - Define HTML base, metadados, providers globais
   - É carregado uma vez e reutilizado

2. **`app/page.tsx`**: 
   - Página inicial (rota `/`)
   - Dashboard principal

3. **`app/login/page.tsx`**: 
   - Página de login (rota `/login`)

### Por que o erro "ChunkLoadError"?

O erro `ChunkLoadError: Loading chunk app/layout failed` ocorre quando:

1. **Backend não está rodando**: O frontend tenta verificar o health check e falha
2. **Cache corrompido**: O Next.js tem chunks (pedaços de código) em cache que estão desatualizados
3. **Build incompleto**: O Next.js não terminou de compilar os arquivos

### Solução

#### 1. Limpar cache do Next.js

```bash
cd frontend
rm -rf .next
npm run dev
```

#### 2. Garantir que o backend está rodando

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

#### 3. Reiniciar tudo

```bash
# Pare todos os processos (Ctrl+C)
# Depois execute:
npm run dev
```

### O que são "chunks"?

**Chunks** são pedaços de código JavaScript que o Next.js divide para:
- Carregar apenas o código necessário
- Melhorar performance
- Permitir carregamento sob demanda

Quando você acessa uma página, o Next.js:
1. Carrega o layout principal (`app/layout.js`)
2. Carrega a página específica (`app/page.js`, `app/login/page.js`, etc.)
3. Carrega componentes usados na página

### Estrutura de Chunks

```
.next/
└── static/
    └── chunks/
        ├── app/
        │   ├── layout.js      ← Layout principal
        │   ├── page.js         ← Página inicial
        │   └── login/
        │       └── page.js     ← Página de login
        └── webpack.js          ← Código do webpack
```

### Erro Comum: "ERR_CONNECTION_REFUSED"

Se você ver `ERR_CONNECTION_REFUSED` no console:

**Causa**: O frontend está tentando se conectar ao backend em `http://localhost:3000`, mas o backend não está rodando.

**Solução**: Inicie o backend primeiro:

```bash
npm run dev:backend
```

### Fluxo de Carregamento

1. **Usuário acessa** `http://localhost:3001`
2. **Next.js carrega** `app/layout.tsx` (layout principal)
3. **Next.js carrega** `app/page.tsx` (página inicial)
4. **React renderiza** os componentes
5. **Frontend verifica** se backend está online (`/health`)
6. **Se backend offline**: Mostra aviso vermelho
7. **Se backend online**: Carrega dados normalmente

### Troubleshooting

#### Erro: "ChunkLoadError"

```bash
# 1. Limpar cache
cd frontend
rm -rf .next

# 2. Reinstalar dependências (se necessário)
rm -rf node_modules
npm install

# 3. Rebuild
npm run dev
```

#### Erro: "ERR_CONNECTION_REFUSED"

```bash
# 1. Verificar se backend está rodando
curl http://localhost:3000/health

# 2. Se não responder, iniciar backend
npm run dev:backend
```

#### Erro: "Module not found"

```bash
# Limpar cache e rebuild
cd frontend
rm -rf .next
npm run dev
```

### Resumo

- **"app"** = Diretório do App Router do Next.js
- **"chunks"** = Pedaços de código JavaScript divididos para performance
- **"layout"** = Layout principal que envolve todas as páginas
- **Erro comum** = Backend não está rodando ou cache corrompido

