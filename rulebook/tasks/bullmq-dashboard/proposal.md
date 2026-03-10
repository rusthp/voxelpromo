# BullMQ Dashboard Integration Proposal
 
## Why
Com a introdução das filas no background via BullMQ (especialmente para disparos do WhatsApp), perdemos a visibilidade direta do que está acontecendo com os jobs ativos, aguardando (waiting), falhos ou postergados. Precisamos de uma interface gráfica administrativa para monitorar esses jobs em tempo real, gerenciar falhas, ver os logs e acompanhar a performance do processamento das filas sem precisar olhar constantemente os terminais.

## What Changes
- Instalação das bibliotecas `@bull-board/api` e `@bull-board/express`.
- Criação de uma nova rota administrativa no backend (`src/routes/bullboard.routes.ts` ou injetando diretamente no Express `server.ts`) restrita a administradores.
- Acoplamento da fila existente `whatsappQueue` ao Bull-board.
- Adicionar o endpoint no express para servir a interface gráfica (ex: `/admin/queues`).
