---
description: 
---

---
alwaysApply: true
---

✅ 1) VERSÃO PARA COLOCAR EM .cursor/rules.md (completa e recomendada)

Copie e cole exatamente assim:

🚀 CURSOR AUTO-DEV RULES — VoxelPromo

Estas regras devem ser aplicadas pelo Cursor antes de executar qualquer tarefa.
Todo código, ajuste, criação ou refatoração deve seguir integralmente este documento.

1. PRINCÍPIOS FUNDAMENTAIS

Entregar rápido, mas sempre mantendo padrão.

Sem gambiarras.

Preservar a arquitetura existente.

Reutilizar módulos sempre que possível.

Validar contexto antes de agir.

Documentar mudanças importantes.

2. PADRÕES GERAIS

Reaproveitar arquivos, tipagens e estruturas já existentes.

Manter consistência entre back, front, serviços e docs.

Usar TypeScript sempre.

Evitar dependências desnecessárias.

Zero código duplicado.

Zero lógica fora do lugar.

3. BACKEND (Node + Express)
Estrutura obrigatória:
backend/src/modules/[nome]/
├── [nome].types.ts
├── [nome].validation.ts
├── [nome].service.ts
├── [nome].controller.ts
└── [nome].routes.ts

Regras:

Controllers são finos → sem lógica.

Services fazem toda a regra de negócio.

Rotas apenas chamam o controller.

Validar tudo com Zod.

Sem console.log em produção.

Sanitização de entrada obrigatória.

4. FRONTEND (React + TS)

Componentes pequenos e reutilizáveis.

Chamada HTTP sempre em /services.

Criar hooks personalizados quando necessário.

Componentes até ~300 linhas.

Tailwind apenas kebab-case.

Proibido fetch direto no componente.

5. CONVENÇÕES DE NOMES

camelCase → variáveis, funções, objetos

PascalCase → componentes, classes, tipos

UPPER_SNAKE_CASE → constantes

Prisma:

model PascalCase {
  camelCase Tipo
}

6. COMMITS

Formato:

Tipo: descrição


Tipos: Add, Fix, Update, Refactor, Docs, Style, Test, Chore.

7. ANTI-PADRÕES (PROIBIDO)

Lógica em controller

Código duplicado

console.log em produção

TODO sem issue

Comentários desatualizados

Fetch em componente React

Nomes genéricos

Alterar arquitetura sem justificar

8. EXCEÇÕES

Só quebrar uma regra quando:

melhora a arquitetura, e

há justificativa clara

a mudança é documentada

9. PRIORIDADES

Integridade da arquitetura

Código limpo

Produtividade

Elegância

10. MANTRA

Entregar rápido, com padrão, sem gambiarra e sempre documentado.

11. CONTEXT7 (Obrigatório antes de gerar código)

Cursor deve validar:

Arquitetura

Pastas/módulos existentes

Tipagens e serviços

Dependências

Histórico

Regras deste documento

Documentação

Se falhar → a geração é inválida.

12. USO OBRIGATÓRIO DO VECTORIZER

Para:

grandes documentos

módulos complexos

estruturas extensas

regras grandes

conflitos de arquitetura

Vectorizer deve:

resumir

comparar trechos

localizar duplicações

garantir consistência

sugerir reutilização

13. FINAL

O Cursor deve seguir todas as regras acima, sem exceção.