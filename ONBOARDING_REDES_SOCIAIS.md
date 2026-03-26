# Guia de Onboarding — Redes Sociais

> **Para quem é este guia?**
> Este guia é para os clientes do VoxelPromo que desejam conectar suas redes sociais e publicar ofertas automaticamente.

---

## Índice

1. [Antes de começar](#antes-de-começar)
2. [Facebook](#facebook)
3. [Instagram](#instagram)
4. [Telegram](#telegram)
5. [WhatsApp](#whatsapp)
6. [Dúvidas Frequentes](#dúvidas-frequentes)

---

## Antes de começar

O VoxelPromo publica ofertas automaticamente nos canais que você conectar. Você pode usar um ou vários ao mesmo tempo.

| Canal | Melhor para | Exige conta profissional? |
|---|---|---|
| Facebook | Grupos, Páginas, alcance orgânico | Sim (Página) |
| Instagram | Imagens de produtos, reels | Sim (Business/Creator) |
| Telegram | Canais e grupos de ofertas | Não |
| WhatsApp | Grupos e listas de transmissão | Sim (Business) |

---

## Facebook

### O que você precisa ter

- Uma **Página do Facebook** criada (não é perfil pessoal)
- Ser **administrador** dessa Página

> Não tem uma Página ainda? Crie em: facebook.com/pages/create

### Como conectar

1. No VoxelPromo, vá em **Configurações → Facebook**
2. Clique em **Conectar Facebook**
3. Uma janela do Facebook abrirá — faça login com sua conta
4. Autorize o VoxelPromo clicando em **Continuar**
5. Selecione qual Página deseja usar para postar ofertas
6. Pronto — o status mudará para **Conectado ✅**

### O que o VoxelPromo irá postar

- Ofertas com imagem → post com foto + legenda
- Ofertas sem imagem → post de texto com link

### Limites automáticos aplicados

| Limite | Valor |
|---|---|
| Posts por dia | 25 |
| Intervalo mínimo entre posts | 30 minutos |

### O token do Facebook expira?

Sim. O token dura aproximadamente **60 dias**. Quando expirar, você receberá um aviso por e-mail e precisará reconectar clicando em **Reconectar Facebook** nas configurações.

---

## Instagram

### O que você precisa ter

- Conta Instagram do tipo **Business** ou **Creator**
- Essa conta precisa estar **vinculada a uma Página do Facebook**

> **Por que precisa de uma Página do Facebook?**
> A API do Instagram (Meta) exige essa vinculação para permitir postagens automáticas. É uma exigência da plataforma, não do VoxelPromo.

### Como converter sua conta para Business/Creator

1. No Instagram → toque nos **3 traços** (canto superior direito)
2. Configurações → Conta → **Mudar para conta profissional**
3. Escolha **Business** ou **Creator**
4. Vincule à sua Página do Facebook quando solicitado

### Como vincular Instagram à Página do Facebook

1. No Instagram → Configurações → Conta
2. **Conta vinculada** → Facebook
3. Selecione sua Página

### Como conectar no VoxelPromo

1. Vá em **Configurações → Instagram**
2. Clique em **Conectar Instagram**
3. Faça login com o Facebook (que está vinculado ao Instagram)
4. Autorize o VoxelPromo
5. O sistema detecta automaticamente sua conta Business
6. Status muda para **Conectado ✅**

### Importante: Instagram exige imagem

O Instagram não permite posts de texto puro via API. Por isso:

- Ofertas **com imagem** → serão postadas normalmente
- Ofertas **sem imagem** → serão ignoradas no Instagram

Para maximizar os posts no Instagram, certifique-se de que as fontes de ofertas que você usa retornem imagens dos produtos.

### Tipos de conteúdo suportados

| Tipo | Suportado |
|---|---|
| Post de feed (imagem) | ✅ |
| Reels | ✅ |
| Stories | ✅ |
| Post de texto puro | ❌ |

---

## Telegram

### O que você precisa ter

- Uma conta no Telegram
- Um **Canal** ou **Grupo** criado (ou use seu chat pessoal para testes)
- Ser administrador do canal/grupo

### Como conectar

1. Vá em **Configurações → Telegram**
2. Insira o **Bot Token** (você recebe do [@BotFather](https://t.me/BotFather))
3. Insira o **Chat ID** do seu canal ou grupo
4. Clique em **Testar Conexão**
5. Se receber uma mensagem de teste no Telegram → **Salvar**

### Como obter o Bot Token

1. Abra o Telegram e busque por **@BotFather**
2. Digite `/newbot`
3. Escolha um nome e username para o bot
4. O BotFather enviará o token — copie e cole no VoxelPromo

### Como obter o Chat ID do canal

1. Adicione o bot como **administrador** do seu canal/grupo
2. Envie uma mensagem no canal
3. Use a rota `/api/telegram/chat-id` do VoxelPromo para descobrir automaticamente

### Dica: formato das mensagens

O Telegram suporta formatação rica. O VoxelPromo envia as ofertas com:

- Título em negrito
- Preço e desconto destacados
- Link de afiliado direto
- Emojis para facilitar a leitura

---

## WhatsApp

### O que você precisa ter

- Número de celular dedicado para o VoxelPromo (recomendado)
- Conta **WhatsApp Business** instalada nesse número

> ⚠️ **Atenção:** Não use seu número pessoal principal. O WhatsApp pode banir números que enviam muitas mensagens automáticas.

### Como conectar

1. Vá em **Configurações → WhatsApp**
2. Clique em **Gerar QR Code**
3. Abra o WhatsApp no celular → **Dispositivos conectados → Conectar dispositivo**
4. Escaneie o QR Code exibido na tela
5. Aguarde a sincronização (pode levar até 1 minuto)
6. Status muda para **Conectado ✅**

### Como adicionar grupos/contatos para receber ofertas

1. Após conectar, vá em **Configurações → WhatsApp → Grupos**
2. A lista de grupos que o número participa aparecerá automaticamente
3. Ative os grupos que devem receber as ofertas

### Limites do WhatsApp

| Limite | Valor |
|---|---|
| Mensagens por hora | Configurável (padrão: 10) |
| Intervalo entre mensagens | Mínimo 3 minutos |

---

## Dúvidas Frequentes

**Posso usar vários canais ao mesmo tempo?**
Sim. Você pode ter Facebook, Instagram, Telegram e WhatsApp ativos simultaneamente. Cada oferta será postada em todos os canais ativos.

**Posso escolher quais canais recebem cada tipo de oferta?**
Sim, em **Configurações → Automação → Canais** você pode ativar ou desativar cada canal individualmente.

**O VoxelPromo vai postar duplicado?**
Não. O sistema rastreia cada oferta por canal (`postedChannels`) e nunca posta a mesma oferta duas vezes no mesmo lugar.

**O que acontece se meu token expirar?**
Você receberá um e-mail de aviso. As postagens naquele canal serão pausadas automaticamente até você reconectar.

**Posso desconectar um canal a qualquer momento?**
Sim. Em Configurações → [Canal] → **Desconectar**. Nenhum dado de oferta é perdido.

**O VoxelPromo tem acesso à minha senha do Facebook/Instagram?**
Não. A conexão é feita via OAuth — você autoriza o app diretamente na plataforma da Meta. O VoxelPromo recebe apenas um token de acesso limitado às permissões que você aprovou.

---

*Dúvidas não respondidas aqui? Entre em contato com o suporte do VoxelPromo.*
