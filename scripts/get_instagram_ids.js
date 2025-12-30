const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n📸 Instagram Setup Helper');
console.log('=========================\n');

function askToken() {
    rl.question('Cole seu Access Token aqui (aquele que começa com EAAB...): ', async (token) => {
        token = token.trim();
        if (!token) {
            console.log('Token não pode estar vazio.');
            return askToken();
        }

        try {
            console.log('\n🔍 Buscando contas vinculadas...\n');
            const response = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
                params: {
                    fields: 'name,id,instagram_business_account{id,username,name},access_token',
                    access_token: token
                }
            });

            const pages = response.data.data;

            if (!pages || pages.length === 0) {
                console.log('❌ Nenhuma página do Facebook encontrada nesta conta.');
                console.log('Certifique-se de que a conta do Facebook que gerou o token administra a página.');
                rl.close();
                return;
            }

            const validPages = pages.filter(p => p.instagram_business_account);

            if (validPages.length === 0) {
                console.log('⚠️ Páginas encontradas, mas nenhuma tem conta do Instagram Business vinculada:');
                pages.forEach(p => console.log(`   - ${p.name} (ID: ${p.id})`));
                console.log('\n👉 Por favor, vincule uma conta do Instagram à sua página do Facebook primeiro.');
                rl.close();
                return;
            }

            console.log('✅ CONTA ENCONTRADA! Copie e cole estas linhas no seu arquivo .env:\n');
            console.log('---------------------------------------------------------------');

            validPages.forEach(page => {
                const ig = page.instagram_business_account;
                console.log(`# Conta: ${ig.username} (${ig.name})`);
                console.log(`INSTAGRAM_ACCESS_TOKEN=${token}`);
                console.log(`INSTAGRAM_IG_USER_ID=${ig.id}`);
                console.log(`INSTAGRAM_PAGE_ID=${page.id}`);
                console.log('---------------------------------------------------------------');
            });

            console.log('\n💡 O INSTAGRAM_APP_ID deve ser preenchido com o ID do Aplicativo (ex: 828910460129262).');

        } catch (error) {
            console.error('❌ Erro ao buscar dados:', error.response?.data?.error?.message || error.message);
        }

        rl.close();
    });
}

askToken();
