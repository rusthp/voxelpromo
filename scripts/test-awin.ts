/**
 * Script para testar conexão com API Awin
 * Uso: npx ts-node scripts/test-awin.ts
 */

import axios from 'axios';

const AWIN_API_TOKEN = 'e6b9d4b1-70d4-4609-974e-0199501f3e67';
const AWIN_PUBLISHER_ID = '2676068';
const BASE_URL = 'https://api.awin.com';

async function testAwinConnection() {
    console.log('🔍 Testando conexão com Awin API...\n');

    const headers = {
        'Authorization': `Bearer ${AWIN_API_TOKEN}`,
        'Content-Type': 'application/json',
    };

    // Test 1: Get Accounts (list all accounts for the user)
    console.log('1️⃣ Testando GET /accounts...');
    try {
        const accountsResponse = await axios.get(`${BASE_URL}/accounts`, {
            headers,
            timeout: 30000,
        });
        console.log('   ✅ Sucesso! Contas encontradas:');
        console.log(JSON.stringify(accountsResponse.data, null, 2));
    } catch (error: any) {
        console.log('   ❌ Erro:', error.response?.status, error.response?.data || error.message);
    }

    // Test 2: Get Quota (check API usage limits)
    console.log('\n2️⃣ Testando GET /publishers/{id}/linkbuilder/quota...');
    try {
        const quotaResponse = await axios.get(
            `${BASE_URL}/publishers/${AWIN_PUBLISHER_ID}/linkbuilder/quota`,
            { headers, timeout: 30000 }
        );
        console.log('   ✅ Sucesso! Quota:');
        console.log(JSON.stringify(quotaResponse.data, null, 2));
    } catch (error: any) {
        console.log('   ❌ Erro:', error.response?.status, error.response?.data || error.message);
    }

    // Test 3: Get Promotions/Offers
    console.log('\n3️⃣ Testando POST /publishers/{id}/promotions...');
    try {
        const promotionsResponse = await axios.post(
            `${BASE_URL}/publishers/${AWIN_PUBLISHER_ID}/promotions`,
            {},
            { headers, timeout: 30000 }
        );
        console.log('   ✅ Sucesso! Promoções encontradas:', promotionsResponse.data?.length || 0);
        if (promotionsResponse.data?.length > 0) {
            console.log('   Primeira promoção:', JSON.stringify(promotionsResponse.data[0], null, 2));
        }
    } catch (error: any) {
        console.log('   ❌ Erro:', error.response?.status, error.response?.data || error.message);
    }

    console.log('\n✅ Teste concluído!');
}

testAwinConnection().catch(console.error);
