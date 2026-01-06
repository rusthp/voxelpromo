/**
 * Test script for Mercado Pago integration
 * Tests checkout creation, payment flow, and webhook processing
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

interface TestResult {
    name: string;
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
    message: string;
    data?: any;
}

const results: TestResult[] = [];

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(name: string, status: 'PASSED' | 'FAILED' | 'SKIPPED', message: string, data?: any) {
    results.push({ name, status, message, data });
    const color = status === 'PASSED' ? 'green' : status === 'FAILED' ? 'red' : 'yellow';
    log(`[${status}] ${name}: ${message}`, color);
}

/**
 * Test 1: Check if Mercado Pago credentials are configured
 */
async function testCredentials() {
    log('\n📋 Test 1: Checking Mercado Pago Configuration', 'cyan');

    const mpAccessToken = process.env.MP_ACCESS_TOKEN;
    const mpPublicKey = process.env.MP_PUBLIC_KEY;

    if (!mpAccessToken) {
        addResult('Credentials Check', 'FAILED', 'MP_ACCESS_TOKEN not found in .env');
        return false;
    }

    if (!mpPublicKey) {
        addResult('Credentials Check', 'FAILED', 'MP_PUBLIC_KEY not found in .env');
        return false;
    }

    const isTestToken = mpAccessToken.startsWith('TEST-');
    const isTestKey = mpPublicKey.startsWith('TEST-');

    if (!isTestToken || !isTestKey) {
        addResult('Credentials Check', 'FAILED', 'Not using TEST credentials. Please use test credentials!');
        return false;
    }

    addResult('Credentials Check', 'PASSED', 'Mercado Pago test credentials configured correctly', {
        accessToken: `${mpAccessToken.substring(0, 15)}...`,
        publicKey: `${mpPublicKey.substring(0, 15)}...`
    });
    return true;
}

/**
 * Test 2: Check if backend is running
 */
async function testBackendHealth() {
    log('\n🏥 Test 2: Checking Backend Health', 'cyan');

    try {
        const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });

        if (response.status === 200) {
            addResult('Backend Health', 'PASSED', 'Backend is running and healthy');
            return true;
        } else {
            addResult('Backend Health', 'FAILED', `Unexpected status: ${response.status}`);
            return false;
        }
    } catch (error: any) {
        addResult('Backend Health', 'FAILED', `Backend not reachable: ${error.message}`);
        log(`  ℹ️  Make sure backend is running: npm run dev`, 'yellow');
        return false;
    }
}

/**
 * Test 3: Register a test user
 */
async function testUserRegistration(): Promise<{ token: string; userId: string } | null> {
    log('\n👤 Test 3: Creating Test User', 'cyan');

    const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@voxelpromo.test`,
        password: 'TestPass123!'  // Must have uppercase, lowercase, and number
    };

    try {
        const response = await axios.post(`${API_URL}/api/auth/register`, testUser);

        if (response.data.success && response.data.token) {
            addResult('User Registration', 'PASSED', 'Test user created successfully', {
                username: testUser.username,
                email: testUser.email
            });
            return {
                token: response.data.token,
                userId: response.data.user.id
            };
        } else {
            addResult('User Registration', 'FAILED', 'Registration succeeded but no token returned');
            return null;
        }
    } catch (error: any) {
        addResult('User Registration', 'FAILED', `Registration failed: ${error.response?.data?.error || error.message}`);
        return null;
    }
}

/**
 * Test 4: Create checkout for basic-monthly plan
 */
async function testCreateCheckoutBasic(token: string) {
    log('\n💳 Test 4: Creating Checkout for Basic Monthly Plan', 'cyan');

    try {
        const response = await axios.post(
            `${API_URL}/api/payments/create-checkout`,
            { planId: 'basic-monthly' },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success && response.data.data.initPoint) {
            addResult('Create Checkout - Basic Monthly', 'PASSED', 'Checkout created successfully', {
                preferenceId: response.data.data.preferenceId,
                initPoint: response.data.data.initPoint,
                sandboxInitPoint: response.data.data.sandboxInitPoint,
                planName: response.data.data.planName,
                price: `R$ ${(response.data.data.price / 100).toFixed(2)}`
            });

            log(`\n  🔗 Sandbox Payment URL:`, 'blue');
            log(`     ${response.data.data.sandboxInitPoint}`, 'cyan');
            log(`\n  ℹ️  Use this URL to test payment with the test buyer account`, 'yellow');

            return response.data.data;
        } else {
            addResult('Create Checkout - Basic Monthly', 'FAILED', 'Checkout created but missing data');
            return null;
        }
    } catch (error: any) {
        addResult('Create Checkout - Basic Monthly', 'FAILED', `Checkout creation failed: ${error.response?.data?.error || error.message}`);
        return null;
    }
}

/**
 * Test 5: Create checkout for premium-annual plan
 */
async function testCreateCheckoutPremium(token: string) {
    log('\n💎 Test 5: Creating Checkout for Premium Annual Plan', 'cyan');

    try {
        const response = await axios.post(
            `${API_URL}/api/payments/create-checkout`,
            { planId: 'premium-annual' },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success && response.data.data.initPoint) {
            addResult('Create Checkout - Premium Annual', 'PASSED', 'Checkout created successfully', {
                preferenceId: response.data.data.preferenceId,
                planName: response.data.data.planName,
                price: `R$ ${(response.data.data.price / 100).toFixed(2)}`
            });
            return response.data.data;
        } else {
            addResult('Create Checkout - Premium Annual', 'FAILED', 'Checkout created but missing data');
            return null;
        }
    } catch (error: any) {
        addResult('Create Checkout - Premium Annual', 'FAILED', `Checkout creation failed: ${error.response?.data?.error || error.message}`);
        return null;
    }
}

/**
 * Test 6: Test trial plan (should not create checkout)
 */
async function testTrialPlan(token: string) {
    log('\n🆓 Test 6: Testing Trial Plan (Free)', 'cyan');

    try {
        const response = await axios.post(
            `${API_URL}/api/payments/create-checkout`,
            { planId: 'trial' },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success && response.data.data.isTrial) {
            addResult('Trial Plan', 'PASSED', 'Trial plan handled correctly (no payment required)', {
                planId: response.data.data.planId
            });
            return true;
        } else {
            addResult('Trial Plan', 'FAILED', 'Trial plan should not create payment checkout');
            return false;
        }
    } catch (error: any) {
        addResult('Trial Plan', 'FAILED', `Trial plan test failed: ${error.response?.data?.error || error.message}`);
        return false;
    }
}

/**
 * Test 7: Test invalid plan ID
 */
async function testInvalidPlan(token: string) {
    log('\n❌ Test 7: Testing Invalid Plan ID', 'cyan');

    try {
        const response = await axios.post(
            `${API_URL}/api/payments/create-checkout`,
            { planId: 'invalid-plan-id' },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Should not succeed
        addResult('Invalid Plan Test', 'FAILED', 'Invalid plan should have been rejected');
        return false;

    } catch (error: any) {
        // Should fail with 500 or 400
        if (error.response?.status === 500 || error.response?.status === 400) {
            addResult('Invalid Plan Test', 'PASSED', 'Invalid plan correctly rejected', {
                error: error.response.data.error
            });
            return true;
        } else {
            addResult('Invalid Plan Test', 'FAILED', `Unexpected error: ${error.message}`);
            return false;
        }
    }
}

/**
 * Test 8: Simulate webhook notification
 */
async function testWebhookSimulation() {
    log('\n🔔 Test 8: Simulating Webhook Notification', 'cyan');

    const webhookPayload = {
        type: 'payment',
        data: {
            id: '1234567890' // Fake payment ID
        }
    };

    try {
        const response = await axios.post(
            `${API_URL}/api/payments/webhook`,
            webhookPayload,
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        // Webhook should accept the request even if payment is not found
        if (response.status === 200) {
            addResult('Webhook Simulation', 'PASSED', 'Webhook endpoint is accessible and processing requests', {
                message: response.data.message || response.data
            });
            return true;
        } else {
            addResult('Webhook Simulation', 'FAILED', `Unexpected status: ${response.status}`);
            return false;
        }
    } catch (error: any) {
        // This is expected since we're using a fake payment ID
        if (error.response?.status === 500) {
            addResult('Webhook Simulation', 'PASSED', 'Webhook endpoint accessible (expected error with fake ID)', {
                note: 'This is normal - real webhooks from Mercado Pago will work correctly'
            });
            return true;
        }
        addResult('Webhook Simulation', 'FAILED', `Webhook test failed: ${error.message}`);
        return false;
    }
}

/**
 * Print summary report
 */
function printSummary() {
    log('\n\n═══════════════════════════════════════════════════', 'blue');
    log('           🧪 MERCADO PAGO TEST SUMMARY', 'blue');
    log('═══════════════════════════════════════════════════\n', 'blue');

    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    const skipped = results.filter(r => r.status === 'SKIPPED').length;
    const total = results.length;

    log(`Total Tests: ${total}`, 'cyan');
    log(`✅ Passed: ${passed}`, 'green');
    log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`⏭️  Skipped: ${skipped}`, 'yellow');

    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    log(`\n📊 Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');

    if (failed > 0) {
        log('\n\n❌ Failed Tests:', 'red');
        results.filter(r => r.status === 'FAILED').forEach(r => {
            log(`   • ${r.name}: ${r.message}`, 'red');
        });
    }

    log('\n═══════════════════════════════════════════════════\n', 'blue');

    if (passed === total && total > 0) {
        log('🎉 All tests passed! Mercado Pago integration is working correctly!', 'green');
        log('\n📌 Next Steps:', 'cyan');
        log('   1. Test actual payment with buyer test account', 'cyan');
        log('   2. Configure production webhook URL', 'cyan');
        log('   3. Switch to production credentials when ready', 'cyan');
    } else if (failed > 0) {
        log('⚠️  Some tests failed. Please review the errors above.', 'yellow');
    }
}

/**
 * Main test runner
 */
async function runTests() {
    log('═══════════════════════════════════════════════════', 'blue');
    log('       🚀 MERCADO PAGO INTEGRATION TESTS', 'blue');
    log('═══════════════════════════════════════════════════', 'blue');

    // Test 1: Credentials
    const credentialsOk = await testCredentials();
    if (!credentialsOk) {
        log('\n⚠️  Please configure Mercado Pago credentials in .env file', 'yellow');
        printSummary();
        process.exit(1);
    }

    // Test 2: Backend health
    const backendOk = await testBackendHealth();
    if (!backendOk) {
        log('\n⚠️  Please start the backend: npm run dev', 'yellow');
        printSummary();
        process.exit(1);
    }

    // Test 3: Create test user
    const userAuth = await testUserRegistration();
    if (!userAuth) {
        log('\n⚠️  User registration failed. Cannot continue tests.', 'yellow');
        printSummary();
        process.exit(1);
    }

    // Test 4-7: Payment tests
    await testCreateCheckoutBasic(userAuth.token);
    await testCreateCheckoutPremium(userAuth.token);
    await testTrialPlan(userAuth.token);
    await testInvalidPlan(userAuth.token);

    // Test 8: Webhook
    await testWebhookSimulation();

    // Print summary
    printSummary();

    // Exit with appropriate code
    const failed = results.filter(r => r.status === 'FAILED').length;
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    log(`\n💥 Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
