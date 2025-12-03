#!/usr/bin/env node
/**
 * Script de Teste Direto da Amazon PA-API
 * Testa a conexão sem precisar do frontend
 */

const axios = require('axios');

const config = {
    amazon: {
        accessKey: 'AKPAFS88QQ1761176703',
        secretKey: 'Bx14ezmTf9NZuNCEFp6SWNQPqHXC',
        associateTag: 'promovoxel-20',
        region: 'sa-east-1',
        marketplace: 'www.amazon.com.br'
    }
};

async function testAmazonConfig() {
    console.log('🧪 Testando Configuração da Amazon PA-API...\n');
    console.log('📋 Configuração:');
    console.log(`   Access Key: ${config.amazon.accessKey.substring(0, 10)}...`);
    console.log(`   Associate Tag: ${config.amazon.associateTag}`);
    console.log(`   Região: ${config.amazon.region}`);
    console.log(`   Marketplace: ${config.amazon.marketplace}\n`);

    try {
        // 1. Salvar configuração
        console.log('1️⃣ Salvando configuração no backend...');
        const saveResponse = await axios.post('http://localhost:3000/api/config', config, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (saveResponse.data.success) {
            console.log('   ✅ Configuração salva com sucesso!\n');
        }

        // 2. Testar conexão
        console.log('2️⃣ Testando conexão com Amazon PA-API...');
        console.log('   ⏳ Aguarde... (pode levar alguns segundos)\n');

        const testResponse = await axios.post(
            'http://localhost:3000/api/config/test',
            { service: 'amazon' },
            { headers: { 'Content-Type': 'application/json' } }
        );

        // 3. Resultado
        console.log('📊 Resultado do Teste:');
        console.log('   Amazon:', testResponse.data.amazon);

        if (testResponse.data.amazon?.success) {
            console.log('\n🎉 SUCESSO! Amazon PA-API configurada e funcionando!');
            console.log('   Mensagem:', testResponse.data.amazon.message);
        } else {
            console.log('\n❌ ERRO na conexão com Amazon PA-API');
            console.log('   Mensagem:', testResponse.data.amazon?.message || 'Erro desconhecido');
            console.log('\n💡 Dica: Se recebeu erro 404, tente alterar a região para "us-east-1"');
        }

    } catch (error) {
        console.error('\n❌ ERRO durante o teste:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Mensagem:', error.response.data?.error || error.response.statusText);
            console.error('   Detalhes:', error.response.data);
        } else if (error.request) {
            console.error('   Erro de conexão - Backend não está respondendo');
            console.error('   Verifique se o backend está rodando em http://localhost:3000');
        } else {
            console.error('   Erro:', error.message);
        }
    }
}

// Executar teste
testAmazonConfig().catch(console.error);
