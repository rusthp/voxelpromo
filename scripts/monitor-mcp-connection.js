#!/usr/bin/env node

/**
 * Script to monitor Mercado Livre MCP connection status
 * 
 * Usage:
 *   node scripts/monitor-mcp-connection.js
 * 
 * This script:
 * 1. Checks token expiration
 * 2. Tests MCP server connectivity
 * 3. Validates token
 * 4. Provides recommendations
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const configPath = path.join(process.cwd(), 'config.json');
const mcpPath = path.join(process.env.HOME || process.env.USERPROFILE, '.cursor', 'mcp.json');

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    return null;
  }
}

function checkTokenExpiration(expiresAt) {
  if (!expiresAt) {
    return { expired: true, reason: 'No expiration date' };
  }
  
  const now = Date.now();
  const isExpired = now >= expiresAt;
  const expiresIn = Math.max(0, Math.floor((expiresAt - now) / 1000));
  
  return {
    expired: isExpired,
    expiresAt: new Date(expiresAt).toISOString(),
    expiresIn,
    expiresInHours: Math.floor(expiresIn / 3600),
    expiresInMinutes: Math.floor((expiresIn % 3600) / 60)
  };
}

async function testToken(token) {
  try {
    const response = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    return {
      valid: true,
      userId: response.data.id,
      nickname: response.data.nickname
    };
  } catch (error) {
    return {
      valid: false,
      error: error.response?.status === 401 ? 'Token inválido ou expirado' : error.message
    };
  }
}

async function testMCPServer() {
  try {
    const response = await axios.get('https://mcp.mercadolibre.com/mcp', {
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    return {
      accessible: response.status < 500,
      status: response.status
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 Verificando status da conexão MCP Mercado Livre...\n');

  // Read config
  const config = readJSON(configPath);
  if (!config) {
    console.error('❌ Error: config.json not found');
    process.exit(1);
  }

  const mlConfig = config.mercadolivre;
  if (!mlConfig) {
    console.error('❌ Error: mercadolivre configuration not found');
    process.exit(1);
  }

  // Check token expiration
  console.log('📊 1. Verificando expiração do token...');
  const expiration = checkTokenExpiration(mlConfig.tokenExpiresAt);
  
  if (expiration.expired) {
    console.log('   ❌ Token EXPIRADO!');
    console.log(`   Expirou em: ${expiration.expiresAt}`);
    console.log('\n💡 Solução: Renove o token:');
    console.log('   1. Settings page → "Renovar Token"');
    console.log('   2. Ou: node scripts/exchange-ml-code.js NOVO_CODIGO');
    console.log('   3. Depois: node scripts/sync-mcp-token.js');
  } else {
    console.log('   ✅ Token válido');
    console.log(`   Expira em: ${expiration.expiresInHours}h ${expiration.expiresInMinutes}m`);
    console.log(`   Expira em: ${expiration.expiresAt}`);
    
    if (expiration.expiresInHours < 1) {
      console.log('   ⚠️  ATENÇÃO: Token expira em menos de 1 hora!');
      console.log('   💡 Renove o token antes que expire.');
    }
  }

  // Test token validity
  console.log('\n🔐 2. Testando validade do token...');
  if (mlConfig.accessToken) {
    const tokenTest = await testToken(mlConfig.accessToken);
    if (tokenTest.valid) {
      console.log('   ✅ Token válido e funcionando');
      console.log(`   User ID: ${tokenTest.userId}`);
      console.log(`   Nickname: ${tokenTest.nickname || 'N/A'}`);
    } else {
      console.log('   ❌ Token inválido ou expirado');
      console.log(`   Erro: ${tokenTest.error}`);
      console.log('\n💡 Solução: Renove o token');
    }
  } else {
    console.log('   ⚠️  Token não encontrado no config.json');
  }

  // Test MCP server connectivity
  console.log('\n🌐 3. Testando conectividade com servidor MCP...');
  const serverTest = await testMCPServer();
  if (serverTest.accessible) {
    console.log('   ✅ Servidor MCP acessível');
    console.log(`   Status: ${serverTest.status}`);
  } else {
    console.log('   ❌ Servidor MCP não acessível');
    console.log(`   Erro: ${serverTest.error || `Status: ${serverTest.status}`}`);
    console.log('\n💡 Possíveis causas:');
    console.log('   - Problemas de rede/firewall');
    console.log('   - Servidor temporariamente indisponível');
    console.log('   - Verifique sua conexão de internet');
  }

  // Check MCP configuration
  console.log('\n⚙️  4. Verificando configuração do MCP...');
  const mcpConfig = readJSON(mcpPath);
  if (!mcpConfig) {
    console.log('   ⚠️  Arquivo mcp.json não encontrado');
    console.log(`   Caminho esperado: ${mcpPath}`);
  } else {
    const mlMCP = mcpConfig.mcpServers?.['mercadolibre-mcp-server'];
    if (!mlMCP) {
      console.log('   ⚠️  Servidor MCP não configurado');
    } else {
      console.log('   ✅ Servidor MCP configurado');
      const mcpToken = mlMCP.headers?.Authorization?.replace('Bearer ', '');
      
      if (mcpToken) {
        if (mcpToken === mlConfig.accessToken) {
          console.log('   ✅ Token no MCP está sincronizado com config.json');
        } else {
          console.log('   ⚠️  Token no MCP está DIFERENTE do config.json');
          console.log('   💡 Execute: node scripts/sync-mcp-token.js');
        }
      } else {
        console.log('   ℹ️  Usando OAuth flow (sem token manual)');
      }
    }
  }

  // Recommendations
  console.log('\n📋 Recomendações:');
  
  if (expiration.expired || (mlConfig.accessToken && !(await testToken(mlConfig.accessToken)).valid)) {
    console.log('   1. ❗ RENOVE O TOKEN IMEDIATAMENTE');
    console.log('   2. Execute: node scripts/sync-mcp-token.js');
    console.log('   3. Reinicie o Cursor');
  } else if (expiration.expiresInHours < 2) {
    console.log('   1. ⚠️  Token expira em breve - renove proativamente');
    console.log('   2. Execute: node scripts/sync-mcp-token.js após renovar');
  } else if (!serverTest.accessible) {
    console.log('   1. Verifique sua conexão de internet');
    console.log('   2. Tente novamente em alguns minutos');
    console.log('   3. Verifique se há firewall bloqueando');
  } else {
    console.log('   ✅ Tudo parece estar funcionando corretamente!');
    console.log('   💡 Se ainda tiver problemas de conexão:');
    console.log('      - Tente reiniciar o Cursor');
    console.log('      - Verifique os logs do MCP no Cursor Settings');
    console.log('      - Considere usar OAuth flow ao invés de token manual');
  }

  console.log('\n📚 Documentação:');
  console.log('   - docs/MCP_CONNECTION_TROUBLESHOOTING.md');
  console.log('   - docs/MERCADOLIVRE_MCP_SETUP.md');
}

main().catch(error => {
  console.error('❌ Erro ao executar verificação:', error.message);
  process.exit(1);
});

