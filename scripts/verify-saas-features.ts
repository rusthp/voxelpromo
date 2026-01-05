import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const TIMESTAMP = Date.now();
const USER = {
    username: `test_agency_${TIMESTAMP}`,
    email: `agency_${TIMESTAMP}@example.com`,
    password: 'Password123!',
    accountType: 'company'
};

const COMPANY_DATA = {
    type: 'company',
    document: '12.345.678/0001-90',
    name: 'Voxel Agency Ltda',
    phone: '(11) 99999-8888',
    address: {
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Sala 1',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
    }
};

async function runVerification() {
    console.log('🚀 Starting SaaS Verification...');
    console.log(`📝 Registering new user: ${USER.username} (${USER.accountType})...`);

    try {
        // 1. Register
        const registerRes = await axios.post(`${API_URL}/auth/register`, USER);
        if (registerRes.status === 201) {
            console.log('✅ Registration successful!');
        } else {
            console.error('❌ Registration failed:', registerRes.data);
            return;
        }

        const { accessToken, user } = registerRes.data;

        // 2. Verify Initial State
        console.log('🔍 Verifying initial state...');
        if (user.billing?.type === 'company') {
            console.log('✅ Billing Type is "company"');
        } else {
            console.error('❌ Billing Type mismatch:', user.billing);
        }

        /*
         * Note: Depending on backend implementation, 'plan' might not be returned in register response 
         * if the User model defaults weren't explicitly populated in the return object 
         * or if the response DTO filters it. 
         * We'll check it in the /me or /profile call to be sure.
         */

        // 3. Update Profile with Company Data
        console.log('📝 Updating profile with Company Information...');

        /* 
         * Note: The PUT /api/profile endpoint expects the 'billing' object within the body directly 
         * or wrapped? Looking at profile.routes.ts...
         * if (req.body.billing) { ... }
         * So we send { billing: COMPANY_DATA }
         */

        const updateRes = await axios.put(`${API_URL}/profile`,
            { billing: COMPANY_DATA },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (updateRes.data.success) {
            console.log('✅ Profile update request successful');
        } else {
            console.error('❌ Profile update failed:', updateRes.data);
        }

        // 4. Verify Persistence (Get Profile)
        console.log('🔍 Fetching profile to verify persistence...');
        const profileRes = await axios.get(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const profile = profileRes.data.profile;
        const savedBilling = profile.billing;

        let success = true;
        if (savedBilling.document === COMPANY_DATA.document) {
            console.log('✅ CNPJ persisted correctly');
        } else {
            console.error(`❌ CNPJ mismatch: Expected ${COMPANY_DATA.document}, got ${savedBilling.document}`);
            success = false;
        }

        if (savedBilling.address.street === COMPANY_DATA.address.street) {
            console.log('✅ Address persisted correctly');
        } else {
            console.error('❌ Address mismatch');
            success = false;
        }

        if (profile.plan?.tier === 'free') {
            console.log('✅ Plan initialized as "free"');
        } else {
            console.error('❌ Plan initialization failed or missing');
        }

        if (success) {
            console.log('\n✨ ALL CHECKS PASSED! SaaS Identity & Profile are working.');
        } else {
            console.log('\n⚠️ Some checks failed.');
        }

    } catch (error: any) {
        console.error('❌ Fatal Error Details:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status
        });
    }
}


runVerification();
