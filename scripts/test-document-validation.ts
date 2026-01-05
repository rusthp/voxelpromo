import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Test CPFs (generated for testing - not real people)
const TEST_CPFS = {
    valid: '529.982.247-25',      // Valid format
    invalid: '111.111.111-11',   // Invalid (all same digits)
    badDigit: '529.982.247-00',  // Wrong check digit
};

// Real CNPJs for testing (public companies)
const TEST_CNPJS = {
    petrobras: '33.000.167/0001-01',  // Petrobras
    invalid: '00.000.000/0000-00',     // Invalid
    badDigit: '33.000.167/0001-99',   // Wrong check digit
};

async function testCPFValidation() {
    console.log('\n📋 Testing CPF Validation...\n');

    // Test valid CPF
    try {
        const res = await axios.post(`${API_URL}/documents/validate-cpf`, { cpf: TEST_CPFS.valid });
        if (res.data.valid) {
            console.log(`✅ Valid CPF (${TEST_CPFS.valid}): PASSED`);
            console.log(`   Formatted: ${res.data.formatted}`);
        } else {
            console.log(`❌ Valid CPF (${TEST_CPFS.valid}): FAILED - Expected valid`);
        }
    } catch (e: any) {
        console.log(`❌ Valid CPF Error: ${e.message}`);
    }

    // Test invalid CPF (all same digits)
    try {
        const res = await axios.post(`${API_URL}/documents/validate-cpf`, { cpf: TEST_CPFS.invalid });
        if (!res.data.valid) {
            console.log(`✅ Invalid CPF (${TEST_CPFS.invalid}): PASSED - Correctly rejected`);
        } else {
            console.log(`❌ Invalid CPF (${TEST_CPFS.invalid}): FAILED - Should be rejected`);
        }
    } catch (e: any) {
        console.log(`❌ Invalid CPF Error: ${e.message}`);
    }

    // Test CPF with wrong check digit
    try {
        const res = await axios.post(`${API_URL}/documents/validate-cpf`, { cpf: TEST_CPFS.badDigit });
        if (!res.data.valid) {
            console.log(`✅ Bad Digit CPF (${TEST_CPFS.badDigit}): PASSED - Correctly rejected`);
        } else {
            console.log(`❌ Bad Digit CPF (${TEST_CPFS.badDigit}): FAILED - Should be rejected`);
        }
    } catch (e: any) {
        console.log(`❌ Bad Digit CPF Error: ${e.message}`);
    }
}

async function testCNPJValidation() {
    console.log('\n🏢 Testing CNPJ Validation + Receita Federal Lookup...\n');

    // Test valid CNPJ (Petrobras)
    try {
        console.log(`🔍 Looking up Petrobras CNPJ (${TEST_CNPJS.petrobras})...`);
        const res = await axios.post(`${API_URL}/documents/validate-cnpj`, { cnpj: TEST_CNPJS.petrobras });
        if (res.data.valid) {
            console.log(`✅ Valid CNPJ: PASSED`);
            console.log(`   Razão Social: ${res.data.razaoSocial}`);
            console.log(`   Nome Fantasia: ${res.data.nomeFantasia}`);
            console.log(`   Situação: ${res.data.situacao}`);
        } else {
            console.log(`❌ Valid CNPJ: FAILED - ${res.data.message}`);
        }
    } catch (e: any) {
        console.log(`❌ Valid CNPJ Error: ${e.response?.data?.error || e.message}`);
    }

    // Test invalid CNPJ
    try {
        const res = await axios.post(`${API_URL}/documents/validate-cnpj`, { cnpj: TEST_CNPJS.invalid });
        if (!res.data.valid) {
            console.log(`✅ Invalid CNPJ (${TEST_CNPJS.invalid}): PASSED - Correctly rejected`);
        } else {
            console.log(`❌ Invalid CNPJ (${TEST_CNPJS.invalid}): FAILED - Should be rejected`);
        }
    } catch (e: any) {
        console.log(`❌ Invalid CNPJ Error: ${e.message}`);
    }

    // Test CNPJ with wrong check digit
    try {
        const res = await axios.post(`${API_URL}/documents/validate-cnpj`, { cnpj: TEST_CNPJS.badDigit });
        if (!res.data.valid) {
            console.log(`✅ Bad Digit CNPJ (${TEST_CNPJS.badDigit}): PASSED - Correctly rejected`);
        } else {
            console.log(`❌ Bad Digit CNPJ (${TEST_CNPJS.badDigit}): FAILED - Should be rejected`);
        }
    } catch (e: any) {
        console.log(`❌ Bad Digit CNPJ Error: ${e.message}`);
    }
}

async function runTests() {
    console.log('🚀 Starting Document Validation Tests...');
    console.log('='.repeat(50));

    try {
        await testCPFValidation();
        await testCNPJValidation();

        console.log('\n' + '='.repeat(50));
        console.log('✨ All tests completed!');
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            console.error('\n❌ ERROR: Backend server is not running!');
            console.error('   Please start the server with: npm run dev');
        } else {
            console.error(`\n❌ Fatal Error: ${error.message}`);
        }
    }
}

runTests();
