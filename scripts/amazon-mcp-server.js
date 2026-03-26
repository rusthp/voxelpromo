#!/usr/bin/env node
/**
 * Amazon PA-API 5.0 — MCP Server
 * Exposes product search and lookup as MCP tools for Claude/Cursor.
 *
 * Tools:
 *   - search_products   : Busca produtos por keyword na Amazon
 *   - get_product       : Busca detalhes de produto(s) por ASIN
 *   - get_affiliate_url : Gera URL de afiliado para um produto
 *
 * Usage (mcp.json):
 *   "command": "node",
 *   "args": ["b:/voxelpromo/scripts/amazon-mcp-server.js"]
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const crypto = require('crypto');
const https = require('https');

// ─── Config ────────────────────────────────────────────────────────────────

const ACCESS_KEY    = process.env.AMAZON_ACCESS_KEY    || '';
const SECRET_KEY    = process.env.AMAZON_SECRET_KEY    || '';
const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || '';
const REGION        = process.env.AMAZON_REGION        || 'BR';

const HOST = 'webservices.amazon.com.br';
const AWS_REGION = 'us-east-1'; // Brazil PA-API always signs with us-east-1
const SERVICE = 'ProductAdvertisingAPI';

// ─── AWS Signature V4 ───────────────────────────────────────────────────────

function hmac(key, data, encoding) {
  return crypto.createHmac('sha256', key).update(data).digest(encoding || undefined);
}

function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function buildAuthHeader(operation, payload) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const amzTarget = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`;
  const path = '/paapi5/' + operation.charAt(0).toLowerCase() + operation.slice(1);

  const canonicalHeaders =
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${amzTarget}\n`;

  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
  const payloadHash = hash(payload);

  const canonicalRequest = [
    'POST', path, '', canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${AWS_REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, credentialScope, hash(canonicalRequest),
  ].join('\n');

  const kDate    = hmac('AWS4' + SECRET_KEY, dateStamp);
  const kRegion  = hmac(kDate, AWS_REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSign    = hmac(kService, 'aws4_request');
  const signature = hmac(kSign, stringToSign, 'hex');

  return {
    authHeader: `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    amzDate,
    amzTarget,
    path,
  };
}

// ─── PA-API Request ─────────────────────────────────────────────────────────

function paRequest(operation, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const { authHeader, amzDate, amzTarget, path } = buildAuthHeader(operation, payload);

    const options = {
      hostname: HOST,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Amz-Date': amzDate,
        'X-Amz-Target': amzTarget,
        'Authorization': authHeader,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(payload);
    req.end();
  });
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function formatProduct(item) {
  const title  = item.ItemInfo?.Title?.DisplayValue || 'N/A';
  const brand  = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || '';
  const price  = item.Offers?.Listings?.[0]?.Price?.DisplayAmount
              || item.Offers?.Summaries?.[0]?.LowestPrice?.DisplayAmount
              || 'Preço não disponível';
  const image  = item.Images?.Primary?.Large?.URL || '';
  const url    = item.DetailPageURL || '';
  const asin   = item.ASIN || '';
  const rating = item.CustomerReviews?.StarRating?.Value;

  return { asin, title, brand, price, image, url, rating: rating ? `${rating}/5` : 'N/A' };
}

// ─── Tools ──────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_products',
    description: 'Busca produtos na Amazon Brasil por palavra-chave. Retorna título, preço, ASIN e URL de afiliado.',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'string', description: 'Termos de busca (ex: "notebook gamer 16gb")' },
        category: { type: 'string', description: 'Categoria Amazon (ex: Electronics, Books). Padrão: All', default: 'All' },
        min_price: { type: 'number', description: 'Preço mínimo em BRL (opcional)' },
        max_price: { type: 'number', description: 'Preço máximo em BRL (opcional)' },
        max_results: { type: 'number', description: 'Número máximo de resultados (1-10). Padrão: 5', default: 5 },
      },
      required: ['keywords'],
    },
  },
  {
    name: 'get_product',
    description: 'Busca detalhes completos de um ou mais produtos pela ASIN da Amazon.',
    inputSchema: {
      type: 'object',
      properties: {
        asins: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de ASINs (máx 10). Ex: ["B09G3HRMVS"]',
        },
      },
      required: ['asins'],
    },
  },
  {
    name: 'get_affiliate_url',
    description: 'Gera URL de afiliado rastreável para um produto Amazon a partir do ASIN.',
    inputSchema: {
      type: 'object',
      properties: {
        asin: { type: 'string', description: 'ASIN do produto' },
      },
      required: ['asin'],
    },
  },
];

// ─── Handlers ───────────────────────────────────────────────────────────────

async function handleSearchProducts(args) {
  if (!ACCESS_KEY || !SECRET_KEY) {
    return { error: 'Amazon PA-API não configurada. Defina AMAZON_ACCESS_KEY e AMAZON_SECRET_KEY.' };
  }

  const body = {
    Keywords: args.keywords,
    SearchIndex: args.category || 'All',
    PartnerTag: ASSOCIATE_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com.br',
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'Offers.Listings.Price',
      'Offers.Summaries.LowestPrice',
      'Images.Primary.Large',
      'CustomerReviews.StarRating',
    ],
    ItemCount: Math.min(args.max_results || 5, 10),
  };

  if (args.min_price) body.MinPrice = Math.round(args.min_price * 100);
  if (args.max_price) body.MaxPrice = Math.round(args.max_price * 100);

  const response = await paRequest('SearchItems', body);

  if (response.Errors) {
    return { error: response.Errors.map(e => `${e.Code}: ${e.Message}`).join('; ') };
  }

  const items = response.SearchResult?.Items || [];
  return {
    total: response.SearchResult?.TotalResultCount || 0,
    results: items.map(formatProduct),
  };
}

async function handleGetProduct(args) {
  if (!ACCESS_KEY || !SECRET_KEY) {
    return { error: 'Amazon PA-API não configurada.' };
  }

  const body = {
    ItemIds: args.asins.slice(0, 10),
    PartnerTag: ASSOCIATE_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com.br',
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Features',
      'Offers.Listings.Price',
      'Offers.Summaries.LowestPrice',
      'Images.Primary.Large',
      'CustomerReviews.StarRating',
      'BrowseNodeInfo.BrowseNodes',
    ],
  };

  const response = await paRequest('GetItems', body);

  if (response.Errors) {
    return { error: response.Errors.map(e => `${e.Code}: ${e.Message}`).join('; ') };
  }

  const items = response.ItemsResult?.Items || [];
  return { results: items.map(formatProduct) };
}

function handleGetAffiliateUrl(args) {
  const url = `https://www.amazon.com.br/dp/${args.asin}?tag=${ASSOCIATE_TAG}`;
  return { asin: args.asin, affiliate_url: url, associate_tag: ASSOCIATE_TAG };
}

// ─── MCP Server ─────────────────────────────────────────────────────────────

async function main() {
  const server = new Server(
    { name: 'amazon-paapi', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;
      if (name === 'search_products')   result = await handleSearchProducts(args);
      else if (name === 'get_product')  result = await handleGetProduct(args);
      else if (name === 'get_affiliate_url') result = handleGetAffiliateUrl(args);
      else return { content: [{ type: 'text', text: `Tool desconhecida: ${name}` }], isError: true };

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Erro: ${error.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write('Amazon MCP Server error: ' + err.message + '\n');
  process.exit(1);
});
