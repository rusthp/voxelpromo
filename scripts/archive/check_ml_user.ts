import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';
import axios from 'axios';

async function checkUser() {
    console.log('👤 Checking Mercado Livre User Status...\n');

    const mlService = new MercadoLivreService();
    const config = mlService.getConfig();

    if (!config.accessToken) {
        console.error('❌ No access token found!');
        return;
    }

    try {
        console.log('🔑 Token found, testing /users/me...');

        const response = await axios.get('https://api.mercadolibre.com/users/me', {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`
            }
        });

        const user = response.data;
        console.log('\n✅ User Data Retrieved:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Nickname: ${user.nickname}`);
        console.log(`   Status: ${user.status?.site_status}`);
        console.log(`   Points: ${user.points}`);
        console.log(`   Site: ${user.site_id}`);
        console.log(`   Permalink: ${user.permalink}`);

        // Check scopes if available in response or we can infer
        // Usually scopes are returned in the token exchange, not /users/me

    } catch (error: any) {
        console.error('❌ Failed to get user data:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

checkUser().catch(console.error);
