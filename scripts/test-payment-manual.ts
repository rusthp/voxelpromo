/**
 * Manual Test Script for Mercado Pago Payment Flow
 * Use this to manually test checkout creation with an existing user
 */

import axios from 'axios';
import * as readline from 'readline';

const API_URL = 'http://localhost:3000';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
}

// Color codes
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

async function testMercadoPagoFlow() {
    log('\n═══════════════════════════════════════════════════', 'blue');
    log('       💳 MERCADO PAGO - MANUAL TEST', 'blue');
    log('═══════════════════════════════════════════════════\n', 'blue');

    try {
        // Step 1: Login
        log('📧 Step 1: Login', 'cyan');
        const email = await question('Enter your email: ');
        const password = await question('Enter your password: ');

        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password
        });

        if (!loginResponse.data.success) {
            log('❌ Login failed!', 'red');
            rl.close();
            return;
        }

        const token = loginResponse.data.accessToken;
        const user = loginResponse.data.user;
        log(`✅ Login successful! Welcome, ${user.username}`, 'green');
        log(`   User ID: ${user.id}`, 'cyan');
        log(`   Email: ${user.email}\n`, 'cyan');

        // Step 2: Choose plan
        log('📋 Step 2: Select Plan', 'cyan');
        log('Available plans:', 'yellow');
        log('  1. basic-monthly (R$ 29,90/month)', 'cyan');
        log('  2. premium-annual (R$ 999,00/year)', 'cyan');
        log('  3. pro (R$ 49,90/month)', 'cyan');
        log('  4. agency (R$ 199,90/month)', 'cyan');
        log('  5. trial (Free)', 'cyan');

        const planChoice = await question('\nSelect plan (1-5): ');
        const plans: Record<string, string> = {
            '1': 'basic-monthly',
            '2': 'premium-annual',
            '3': 'pro',
            '4': 'agency',
            '5': 'trial'
        };

        const selectedPlan = plans[planChoice];
        if (!selectedPlan) {
            log('❌ Invalid plan selected', 'red');
            rl.close();
            return;
        }

        log(`\n💎 Creating checkout for plan: ${selectedPlan}`, 'yellow');

        // Step 3: Create checkout
        const checkoutResponse = await axios.post(
            `${API_URL}/api/payments/create-checkout`,
            { planId: selectedPlan },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!checkoutResponse.data.success) {
            log(`❌ Checkout creation failed: ${checkoutResponse.data.error}`, 'red');
            rl.close();
            return;
        }

        const checkout = checkoutResponse.data.data;

        // Handle trial plan
        if (checkout.isTrial) {
            log('\n✅ Trial plan activated! No payment required.', 'green');
            log('   Plan: trial', 'cyan');
            log('   Duration: 7 days', 'cyan');
            rl.close();
            return;
        }

        // Display checkout details
        log('\n✅ Checkout created successfully!', 'green');
        log('\n📊 Checkout Details:', 'yellow');
        log(`   Preference ID: ${checkout.preferenceId}`, 'cyan');
        log(`   Plan: ${checkout.planName}`, 'cyan');
        log(`   Price: R$ ${(checkout.price / 100).toFixed(2)}`, 'cyan');

        log('\n🔗 Payment URLs:', 'yellow');
        log(`   Production: ${checkout.initPoint}`, 'cyan');
        log(`   Sandbox (Test): ${checkout.sandboxInitPoint}`, 'green');

        log('\n📌 Next Steps:', 'yellow');
        log('   1. Open the SANDBOX URL above in your browser', 'cyan');
        log('   2. Login with test BUYER account:', 'cyan');
        log(`      User: TESTUSER1857354735787011567`, 'green');
        log(`      Password: qVlVjHJEXY`, 'green');
        log('   3. Complete payment with test card:', 'cyan');
        log('      Card: 5031 4332 1540 6351', 'green');
        log('      CVV: 123', 'green');
        log('      Expiry: Any future date', 'green');
        log('   4. After payment, check your subscription status', 'cyan');

        log('\n🎯 Testing Payment URL...', 'yellow');
        const testPayment = await question('\nDo you want to open the payment URL? (y/n): ');

        if (testPayment.toLowerCase() === 'y') {
            // In Windows, use 'start' command to open browser
            const { spawn } = await import('child_process');
            spawn('cmd', ['/c', 'start', '', checkout.sandboxInitPoint], {
                detached: true,
                stdio: 'ignore'
            }).unref();

            log('✅ Payment URL opened in browser!', 'green');
        }

        log('\n═══════════════════════════════════════════════════', 'blue');
        log('           ✨ TEST COMPLETED', 'blue');
        log('═══════════════════════════════════════════════════\n', 'blue');

        rl.close();

    } catch (error: any) {
        log(`\n❌ Error: ${error.response?.data?.error || error.message}`, 'red');
        if (error.response?.data) {
            console.log('\nResponse:', error.response.data);
        }
        rl.close();
    }
}

// Run
testMercadoPagoFlow();
