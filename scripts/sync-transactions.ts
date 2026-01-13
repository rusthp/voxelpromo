import mongoose from 'mongoose';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';

if (!MP_ACCESS_TOKEN) {
    console.error('❌ MP_ACCESS_TOKEN is missing in .env');
    process.exit(1);
}

// Models
import { TransactionModel } from '../src/models/Transaction';
import { UserModel } from '../src/models/User';

async function syncTransactions() {
    console.log('🔄 Starting Mercado Pago Transaction Sync...');

    try {
        // 1. Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 2. Initialize Mercado Pago
        const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN! });
        const payment = new Payment(client);

        // 3. Search for payments (last 180 days mostly)
        // MP Search API might require ISO dates or other filters
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);

        console.log(`fetching payments since ${sixMonthsAgo.toISOString()}`);

        const response = await payment.search({
            options: {
                limit: 100, // MP default limit
                offset: 0,
                sort: 'date_created',
                criteria: 'desc',
                range: 'date_created',
                begin_date: sixMonthsAgo.toISOString(),
                end_date: today.toISOString()
            }
        });

        const payments = response.results || [];
        console.log(`📦 Found ${payments.length} payments in Mercado Pago`);

        if (payments.length === 0) {
            console.log('No payments found to sync.');
            process.exit(0);
        }

        let syncedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const p of payments) {
            // Check if already exists
            const exists = await TransactionModel.findOne({ mpPaymentId: p.id?.toString() });
            if (exists) {
                skippedCount++;
                process.stdout.write('.');
                continue;
            }

            // Find user by email
            const email = p.payer?.email;
            const user = await UserModel.findOne({ email });

            if (!user) {
                // Try to find via external_reference (userId-planId-timestamp)
                const extRef = p.external_reference;
                if (extRef) {
                    const [userId] = extRef.split('-');
                    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                        const userById = await UserModel.findById(userId);
                        if (userById) {
                            await createTransaction(p, userById);
                            syncedCount++;
                            process.stdout.write('+');
                            continue;
                        }
                    }
                }

                // console.warn(`⚠️ User not found for payment ${p.id} (email: ${email})`);
                errorCount++;
                process.stdout.write('!');
                continue;
            }

            await createTransaction(p, user);
            syncedCount++;
            process.stdout.write('+');
        }

        console.log(`\n\n✅ Sync Complete!`);
        console.log(`   - Synced: ${syncedCount}`);
        console.log(`   - Skipped: ${skippedCount}`);
        console.log(`   - Errors (User not found): ${errorCount}`);

    } catch (error) {
        console.error('\n❌ Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

async function createTransaction(mpPayment: any, user: any) {
    const statusMap: any = {
        'approved': 'approved',
        'pending': 'pending',
        'in_process': 'pending',
        'rejected': 'rejected',
        'cancelled': 'cancelled',
        'refunded': 'refunded',
        'charged_back': 'cancelled'
    };

    const typeMap: any = {
        'approved': 'payment_approved',
        'refunded': 'refund',
        'charged_back': 'chargeback'
    };

    // Determine plan info from external_reference (format: userId-planId-timestamp)
    let planId = 'unknown';
    if (mpPayment.external_reference) {
        const parts = mpPayment.external_reference.split('-');
        if (parts.length >= 2) planId = parts[1];
    }

    // Or map by amount if planId is missing (heuristic)
    if (planId === 'unknown') {
        const amount = mpPayment.transaction_amount;
        if (amount === 29.90) planId = 'basic-monthly';
        else if (amount === 59.90) planId = 'pro';
        else if (amount === 149.90) planId = 'agency';
    }

    await TransactionModel.create({
        userId: user._id,
        type: typeMap[mpPayment.status] || (mpPayment.status === 'approved' ? 'payment_approved' : 'payment_failed'),
        provider: 'mercadopago',
        mpPaymentId: mpPayment.id?.toString(),
        mpSubscriptionId: undefined, // Would need preapproval_id if available
        planId: planId,
        planName: planId, // Placeholder
        amount: Math.round(mpPayment.transaction_amount * 100), // Convert to cents
        currency: 'BRL',
        status: statusMap[mpPayment.status] || 'pending',
        statusDetail: mpPayment.status_detail,
        paymentMethod: mpPayment.payment_method_id === 'pix' ? 'pix' : mpPayment.payment_method_id === 'bolbradesco' ? 'boleto' : 'card',
        userEmail: user.email,
        userName: user.username,
        createdAt: new Date(mpPayment.date_created)
    });
}

// Run
syncTransactions();
