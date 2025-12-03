// @ts-ignore - Missing types, install with: npm i --save-dev @types/swagger-jsdoc
import swaggerJsdoc from 'swagger-jsdoc';
// @ts-ignore - Missing types, install with: npm i --save-dev @types/swagger-ui-express
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VoxelPromo API',
            version: '1.0.0',
            description: 'API para automação de ofertas de afiliados com postagem em múltiplas plataformas',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: '60d21b4667d0d8992e610c85' },
                        username: { type: 'string', example: 'johndoe' },
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
                        isActive: { type: 'boolean', example: true },
                        lastLogin: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Offer: {
                    type: 'object',
                    required: ['title', 'description', 'originalPrice', 'currentPrice', 'imageUrl', 'productUrl', 'source'],
                    properties: {
                        _id: { type: 'string', example: '60d21b4667d0d8992e610c85' },
                        title: { type: 'string', example: 'Samsung Galaxy S21 Ultra' },
                        description: { type: 'string', example: 'Smartphone top de linha...' },
                        originalPrice: { type: 'number', example: 5999.99 },
                        currentPrice: { type: 'number', example: 3499.99 },
                        discount: { type: 'number', example: 2500 },
                        discountPercentage: { type: 'number', example: 41.67 },
                        currency: { type: 'string', example: 'BRL' },
                        imageUrl: { type: 'string', example: 'https://example.com/image.jpg' },
                        productUrl: { type: 'string', example: 'https://shopee.com.br/...' },
                        affiliateUrl: { type: 'string', example: 'https://shope.ee/...' },
                        source: { type: 'string', enum: ['amazon', 'aliexpress', 'shopee', 'rss', 'manual'] },
                        category: { type: 'string', example: 'electronics' },
                        rating: { type: 'number', example: 4.5 },
                        reviewsCount: { type: 'number', example: 1234 },
                        isActive: { type: 'boolean', example: true },
                        isPosted: { type: 'boolean', example: false },
                        postedAt: { type: 'string', format: 'date-time' },
                        scheduledAt: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Error message' },
                        details: { type: 'array', items: { type: 'object' } },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/routes/*.js'], // Path to API routes
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
    // Swagger UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'VoxelPromo API Docs',
    }));

    // Swagger JSON
    app.get('/api-docs.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}
