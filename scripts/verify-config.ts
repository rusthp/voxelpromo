#!/usr/bin/env ts-node
/**
 * Script to verify configuration is saved and loaded correctly
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const configPath = join(process.cwd(), 'config.json');

console.log('🔍 Verificando configuração...\n');

if (!existsSync(configPath)) {
  console.error('❌ config.json não encontrado!');
  process.exit(1);
}

try {
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  
  console.log('✅ config.json encontrado\n');
  
  // Verificar Telegram
  console.log('📱 Telegram:');
  if (config.telegram?.botToken) {
    const tokenLength = config.telegram.botToken.length;
    console.log(`  ✅ Bot Token: ${tokenLength} caracteres`);
    if (tokenLength < 40) {
      console.log(`  ⚠️  AVISO: Token muito curto (esperado: 45+)`);
    }
  } else {
    console.log('  ❌ Bot Token: NÃO CONFIGURADO');
  }
  
  if (config.telegram?.chatId) {
    console.log(`  ✅ Chat ID: ${config.telegram.chatId}`);
  } else {
    console.log('  ❌ Chat ID: NÃO CONFIGURADO');
  }
  
  // Verificar Groq
  console.log('\n🤖 Groq AI:');
  if (config.ai?.groqApiKey) {
    const keyLength = config.ai.groqApiKey.length;
    console.log(`  ✅ API Key: ${keyLength} caracteres`);
    if (keyLength < 40) {
      console.log(`  ⚠️  AVISO: API Key muito curta (esperado: 50+)`);
    }
    if (!config.ai.groqApiKey.startsWith('gsk_')) {
      console.log(`  ⚠️  AVISO: API Key não começa com 'gsk_'`);
    }
  } else {
    console.log('  ❌ API Key: NÃO CONFIGURADO');
  }
  
  if (config.ai?.provider) {
    console.log(`  ✅ Provider: ${config.ai.provider}`);
  } else {
    console.log('  ⚠️  Provider: não definido (padrão: groq)');
  }
  
  // Verificar outras configurações
  console.log('\n📦 Outras configurações:');
  console.log(`  Amazon: ${config.amazon?.accessKey ? '✅' : '❌'}`);
  console.log(`  AliExpress: ${config.aliexpress?.appKey ? '✅' : '❌'}`);
  console.log(`  WhatsApp: ${config.whatsapp?.enabled ? '✅ Habilitado' : '❌ Desabilitado'}`);
  console.log(`  RSS Feeds: ${config.rss?.length || 0} feeds`);
  console.log(`  Coleta Automática: ${config.collection?.enabled ? '✅' : '❌'}`);
  
  console.log('\n✅ Verificação concluída!');
  
} catch (error: any) {
  console.error('❌ Erro ao ler config.json:', error.message);
  process.exit(1);
}

