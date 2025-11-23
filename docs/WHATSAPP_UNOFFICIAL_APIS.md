# 📱 WhatsApp - APIs Não Oficiais

Este guia explica como usar APIs não oficiais do WhatsApp para enviar mensagens gratuitamente.

## 📋 Visão Geral

APIs não oficiais funcionam simulando o WhatsApp Web. Você sobe um servidor Node.js que escaneia um QR code e mantém a conexão ativa.

## 🔄 Como Funciona

1. **Rodar servidor Node.js** que simula WhatsApp Web
2. **Escanear QR code** com seu celular
3. **Sistema fica online**, conectado ao seu WhatsApp
4. **Seu app** faz requisições ao servidor: "envia essa mensagem"

## 📚 Bibliotecas Disponíveis

### 1. whatsapp-web.js (Atual)

**Status**: ✅ Já implementado no projeto

**Vantagens**:
- ✅ Estável e bem mantida
- ✅ Fácil de usar
- ✅ Suporta imagens e mídia
- ✅ LocalAuth (salva sessão)

**Desvantagens**:
- ⚠️ Usa Puppeteer (mais pesado)
- ⚠️ Pode ser detectado mais facilmente

**Instalação**:
```bash
npm install whatsapp-web.js qrcode-terminal
```

**Uso**:
```typescript
import { Client, LocalAuth } from 'whatsapp-web.js';

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  console.log('QR Code:', qr);
});

client.on('ready', () => {
  console.log('WhatsApp pronto!');
});

await client.sendMessage('5511999999999@c.us', 'Mensagem');
```

### 2. Baileys (Recomendado)

**Status**: ⭐ Melhor opção para produção

**Vantagens**:
- ✅ **Mais leve** (não usa Puppeteer)
- ✅ **Mais rápido**
- ✅ **Menos detectável** pelo WhatsApp
- ✅ Suporta todas as funcionalidades
- ✅ Atualizações frequentes

**Desvantagens**:
- ⚠️ API mais complexa
- ⚠️ Requer mais configuração

**Instalação**:
```bash
npm install @whiskeysockets/baileys
```

**Exemplo Básico**:
```typescript
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    browser: ['VoxelPromo', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp conectado!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    // Processar mensagens recebidas
  });

  // Enviar mensagem
  await sock.sendMessage('5511999999999@s.whatsapp.net', {
    text: '🔥 Nova oferta disponível!'
  });
}

connectToWhatsApp();
```

### 3. Venom-bot

**Status**: ⚠️ Menos mantido

**Vantagens**:
- ✅ API simples
- ✅ Boa documentação

**Desvantagens**:
- ⚠️ Menos atualizado
- ⚠️ Usa Puppeteer
- ⚠️ Pode ter problemas de compatibilidade

**Instalação**:
```bash
npm install venom-bot
```

**Exemplo**:
```typescript
import { create, Whatsapp } from 'venom-bot';

create({
  session: 'voxelpromo',
  multiDevice: true
})
  .then((client: Whatsapp) => {
    client.onMessage((message) => {
      // Processar mensagens
    });

    // Enviar mensagem
    client.sendText('5511999999999@c.us', '🔥 Nova oferta disponível!');
  });
```

### 4. WPPConnect

**Status**: ✅ Boa alternativa

**Vantagens**:
- ✅ API simples e intuitiva
- ✅ Boa documentação
- ✅ Suporta múltiplos dispositivos
- ✅ Ativo e mantido

**Desvantagens**:
- ⚠️ Usa Puppeteer (mais pesado que Baileys)

**Instalação**:
```bash
npm install @wppconnect-team/wppconnect
```

**Exemplo**:
```typescript
import { create, Whatsapp } from '@wppconnect-team/wppconnect';

create({
  session: 'voxelpromo',
  catchQR: (base64Qr, asciiQR) => {
    console.log(asciiQR); // QR code no terminal
  },
  statusFind: (statusSession, session) => {
    console.log('Status:', statusSession);
  }
})
  .then((client: Whatsapp) => {
    // Enviar mensagem
    client.sendText('5511999999999@c.us', '🔥 Nova oferta disponível!');
  });
```

## 📊 Comparação

| Biblioteca | Leveza | Velocidade | Detecção | Manutenção | Recomendação |
|------------|--------|------------|----------|------------|--------------|
| **Baileys** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **Melhor** |
| **WPPConnect** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Boa |
| **whatsapp-web.js** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ✅ Atual |
| **Venom-bot** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⚠️ Evitar |

## ⚠️ Riscos e Limitações

### Risco de Banimento

O WhatsApp pode banir sua conta se detectar uso anormal:

**Sinais de uso anormal**:
- ❌ Muitas mensagens em pouco tempo
- ❌ Mensagens idênticas para muitos contatos
- ❌ Uso de automação detectável
- ❌ Comportamento não humano

**Como evitar**:
- ✅ Use delays entre mensagens (3-5 segundos)
- ✅ Varie o conteúdo das mensagens
- ✅ Não envie para muitos contatos de uma vez
- ✅ Use apenas para uso pessoal/pequeno negócio
- ✅ Mantenha o servidor sempre online (evita reconexões)

### Limitações Técnicas

- ⚠️ **Precisa manter servidor ativo** - Se o servidor cair, precisa escanear QR novamente
- ⚠️ **Não é oficial** - Pode parar de funcionar a qualquer momento
- ⚠️ **Sem garantias** - WhatsApp pode mudar o protocolo

## 🚀 Implementação no VoxelPromo

### Opção 1: Manter whatsapp-web.js (Atual)

**Prós**:
- ✅ Já implementado
- ✅ Funciona
- ✅ Estável

**Contras**:
- ⚠️ Mais pesado
- ⚠️ Mais detectável

### Opção 2: Migrar para Baileys (Recomendado)

**Prós**:
- ✅ Mais leve e rápido
- ✅ Menos detectável
- ✅ Melhor para produção

**Contras**:
- ⚠️ Requer refatoração do código

### Opção 3: Suportar Múltiplas Bibliotecas

Permitir escolher a biblioteca via configuração:

```json
{
  "whatsapp": {
    "enabled": true,
    "library": "baileys", // ou "whatsapp-web.js", "wppconnect"
    "targetNumber": "5511999999999"
  }
}
```

## 📝 Exemplo de Implementação com Baileys

```typescript
// src/services/messaging/WhatsAppServiceBaileys.ts
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';

export class WhatsAppServiceBaileys {
  private sock: WASocket | null = null;
  private isReady = false;
  private targetNumber: string;

  constructor() {
    this.targetNumber = process.env.WHATSAPP_TARGET_NUMBER || '';
  }

  async initialize(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      printQRInTerminal: true,
      auth: state,
      browser: ['VoxelPromo', 'Chrome', '1.0.0']
    });

    this.sock.ev.on('creds.update', saveCreds);
    
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          this.initialize();
        }
      } else if (connection === 'open') {
        logger.info('WhatsApp (Baileys) conectado!');
        this.isReady = true;
      }
    });
  }

  async sendOffer(offer: Offer): Promise<boolean> {
    if (!this.sock || !this.isReady) {
      await this.initialize();
      // Aguardar conexão
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    try {
      const message = this.formatMessage(offer);
      const jid = `${this.targetNumber}@s.whatsapp.net`;

      await this.sock.sendMessage(jid, { text: message });

      // Enviar imagem se houver
      if (offer.imageUrl) {
        const image = await fetch(offer.imageUrl);
        const buffer = await image.arrayBuffer();
        await this.sock.sendMessage(jid, {
          image: Buffer.from(buffer),
          caption: offer.title
        });
      }

      logger.info(`Oferta enviada via WhatsApp (Baileys): ${offer.title}`);
      return true;
    } catch (error) {
      logger.error('Erro ao enviar oferta via WhatsApp (Baileys):', error);
      return false;
    }
  }

  private formatMessage(offer: Offer): string {
    return `🔥 *${offer.title}*

💰 De R$ ${offer.originalPrice.toFixed(2)} por R$ ${offer.currentPrice.toFixed(2)}
🎯 ${offer.discountPercentage.toFixed(0)}% OFF

🔗 ${offer.affiliateUrl}`;
  }
}
```

## 🔧 Configuração

### config.json

```json
{
  "whatsapp": {
    "enabled": true,
    "library": "baileys",
    "targetNumber": "5511999999999"
  }
}
```

### Variáveis de Ambiente

```env
WHATSAPP_ENABLED=true
WHATSAPP_TARGET_NUMBER=5511999999999
WHATSAPP_LIBRARY=baileys
```

## ✅ Checklist de Implementação

- [ ] Escolher biblioteca (recomendado: Baileys)
- [ ] Instalar dependências
- [ ] Implementar serviço
- [ ] Adicionar configuração
- [ ] Testar QR code
- [ ] Testar envio de mensagens
- [ ] Testar envio de imagens
- [ ] Adicionar delays entre mensagens
- [ ] Documentar uso

## 📚 Recursos

- [Baileys GitHub](https://github.com/WhiskeySockets/Baileys)
- [WPPConnect GitHub](https://github.com/wppconnect-team/wppconnect)
- [whatsapp-web.js GitHub](https://github.com/pedroslopez/whatsapp-web.js)
- [Venom-bot GitHub](https://github.com/orkestral/venom)

## ⚠️ Aviso Legal

O uso de APIs não oficiais do WhatsApp pode violar os Termos de Serviço do WhatsApp. Use por sua conta e risco. Recomendamos usar apenas para:
- Uso pessoal
- Pequenos negócios
- Testes e desenvolvimento

Para uso comercial em larga escala, considere usar a [API oficial do WhatsApp Business](https://www.whatsapp.com/business/api).




