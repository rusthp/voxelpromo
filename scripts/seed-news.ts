import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NewsItem from '../src/models/NewsItem';

dotenv.config();

const newsItems = [
    {
        title: "Novas Páginas Legais e Conformidade LGPD",
        content: `
            <p>Implementamos novas páginas de <b>Termos de Uso</b> e <b>Política de Privacidade</b>.</p>
            <ul>
                <li>Conteúdo jurídico formal e detalhado.</li>
                <li>Total conformidade com a <b>LGPD</b> (Lei Geral de Proteção de Dados).</li>
                <li>Sessão dedicada para transparência no tratamento de dados.</li>
            </ul>
        `,
        type: 'feature',
        published: true,
        tags: ['legal', 'lgpd', 'compliance'],
        publishedAt: new Date()
    },
    {
        title: "Identidade Visual Renovada",
        content: `
            <p>O VoxelPromo está de cara nova! Atualizamos nossa identidade visual para refletir nossa energia e inovação.</p>
            <ul>
                <li>Nova paleta de cores vibrantes (Ciano, Rosa e Laranja).</li>
                <li>Interface modernizada com "Glassmorphism".</li>
                <li>Melhorias na experiência do usuário (UX) em toda a plataforma.</li>
            </ul>
        `,
        type: 'improvement',
        published: true,
        tags: ['design', 'ui/ux', 'branding'],
        publishedAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    },
    {
        title: "Integração com Mercado Pago",
        content: `
            <p>Finalizamos a integração completa com o Mercado Pago para gestão de assinaturas.</p>
            <p>Agora você pode assinar planos Pro e Enterprise com segurança e facilidade, utilizando cartão de crédito ou Pix com aprovação imediata.</p>
        `,
        type: 'feature',
        published: true,
        tags: ['pagamentos', 'mercado pago', 'assinaturas'],
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
    },
    {
        title: "Correções no Painel Administrativo",
        content: `
            <p>Realizamos correções importantes no Dashboard Administrativo:</p>
            <ul>
                <li>Correção no carregamento da tabela de assinaturas (Admin).</li>
                <li>Otimização de performance nas consultas de usuários.</li>
            </ul>
        `,
        type: 'fix',
        published: true,
        tags: ['admin', 'bugfix', 'performance'],
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3) // 3 hours ago
    },
    {
        title: "Canais Oficiais nas Redes Sociais",
        content: `
            <p>Siga o VoxelPromo nas redes sociais e fique por dentro de tudo!</p>
            <p>Adicionamos links diretos no rodapé para:</p>
            <ul>
                <li><b>Telegram</b>: Canal de avisos e comunidade.</li>
                <li><b>Instagram</b>: Dicas e bastidores.</li>
                <li><b>X (Twitter)</b>: Atualizações em tempo real.</li>
            </ul>
        `,
        type: 'announcement',
        published: true,
        tags: ['social', 'comunidade'],
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4) // 4 hours ago
    }
];

async function seedNews() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing news only if needed, or just append. 
        // For this task, let's clear to ensure clean state for the demo
        await NewsItem.deleteMany({});
        console.log('Cleared existing news items');

        const result = await NewsItem.insertMany(newsItems);
        console.log(`Successfully seeded ${result.length} news items!`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding news:', error);
        process.exit(1);
    }
}

seedNews();
