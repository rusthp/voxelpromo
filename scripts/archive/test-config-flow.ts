#!/usr/bin/env ts-node
/**
 * Script to test the complete configuration flow
 * Simulates saving and loading config
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const configPath = join(process.cwd(), 'config.json');

console.log('🧪 Testando fluxo de configuração...\n');

// Test 1: Read existing config
console.log('1️⃣  Teste: Ler config.json existente');
if (!existsSync(configPath)) {
  console.error('❌ config.json não encontrado!');
  process.exit(1);
}

let config: any;
try {
  config = JSON.parse(readFileSync(configPath, 'utf-8'));
  console.log('✅ Config lido com sucesso');
  console.log(`   Telegram botToken: ${config.telegram?.botToken?.length || 0} chars`);
  console.log(`   Groq API key: ${config.ai?.groqApiKey?.length || 0} chars\n`);
} catch (error: any) {
  console.error('❌ Erro ao ler config:', error.message);
  process.exit(1);
}

// Test 2: Modify and save
console.log('2️⃣  Teste: Modificar e salvar');
const testConfig = {
  ...config,
  test: {
    timestamp: new Date().toISOString(),
    testValue: 'test-' + Date.now()
  }
};

try {
  writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
  console.log('✅ Config salvo com sucesso\n');
} catch (error: any) {
  console.error('❌ Erro ao salvar config:', error.message);
  process.exit(1);
}

// Test 3: Read back
console.log('3️⃣  Teste: Ler config salvo');
try {
  const savedConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  if (savedConfig.test?.testValue === testConfig.test.testValue) {
    console.log('✅ Config lido corretamente após salvar');
    console.log(`   Test value: ${savedConfig.test.testValue}\n`);
  } else {
    console.error('❌ Config não corresponde ao que foi salvo!');
    process.exit(1);
  }
} catch (error: any) {
  console.error('❌ Erro ao ler config salvo:', error.message);
  process.exit(1);
}

// Test 4: Restore original
console.log('4️⃣  Teste: Restaurar config original');
try {
  delete config.test;
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Config original restaurado\n');
} catch (error: any) {
  console.error('❌ Erro ao restaurar config:', error.message);
  process.exit(1);
}

console.log('✅ Todos os testes passaram!');
console.log('\n💡 Se o nodemon reiniciar, o config.json será carregado automaticamente');

