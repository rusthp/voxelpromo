# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Offers

#### GET /offers
Get all offers with optional filters.

**Query Parameters:**
- `minDiscount` (number): Minimum discount percentage
- `maxPrice` (number): Maximum price
- `minPrice` (number): Minimum price
- `minRating` (number): Minimum rating (0-5)
- `categories` (string): Comma-separated categories
- `sources` (string): Comma-separated sources (amazon, aliexpress, rss, etc)
- `excludePosted` (boolean): Exclude already posted offers
- `limit` (number): Maximum number of results
- `skip` (number): Number of results to skip

**Example:**
```bash
GET /api/offers?minDiscount=20&maxPrice=500&limit=10
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Product Name",
    "currentPrice": 299.99,
    "originalPrice": 399.99,
    "discountPercentage": 25,
    "source": "amazon",
    "category": "electronics",
    "isPosted": false,
    ...
  }
]
```

#### GET /offers/:id
Get a specific offer by ID.

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Product Name",
  ...
}
```

#### POST /offers
Create a new offer.

**Request Body:**
```json
{
  "title": "Product Name",
  "description": "Product description",
  "originalPrice": 399.99,
  "currentPrice": 299.99,
  "discount": 100,
  "discountPercentage": 25,
  "currency": "BRL",
  "imageUrl": "https://example.com/image.jpg",
  "productUrl": "https://example.com/product",
  "affiliateUrl": "https://example.com/product?ref=affiliate",
  "source": "manual",
  "category": "electronics"
}
```

#### POST /offers/:id/generate-post
Generate AI post for an offer.

**Request Body:**
```json
{
  "tone": "viral"
}
```

**Tone options:** `casual`, `professional`, `viral`, `urgent`

**Response:**
```json
{
  "post": "🔥 Product Name\n\n💰 De R$ 399,99 por R$ 299,99\n🎯 25% OFF\n\n#electronics #oferta"
}
```

#### POST /offers/:id/post
Post offer to channels.

**Request Body:**
```json
{
  "channels": ["telegram", "whatsapp"]
}
```

**Response:**
```json
{
  "success": true
}
```

#### DELETE /offers/:id
Delete (deactivate) an offer.

**Response:**
```json
{
  "success": true
}
```

### Collector

#### POST /collector/amazon
Collect offers from Amazon.

**Request Body:**
```json
{
  "keywords": "electronics",
  "category": "electronics"
}
```

**Response:**
```json
{
  "success": true,
  "collected": 15
}
```

#### POST /collector/aliexpress
Collect offers from AliExpress.

**Request Body:**
```json
{
  "category": "electronics"
}
```

**Response:**
```json
{
  "success": true,
  "collected": 20
}
```

#### POST /collector/rss
Collect offers from RSS feed.

**Request Body:**
```json
{
  "feedUrl": "https://example.com/feed.xml",
  "source": "pelando"
}
```

**Response:**
```json
{
  "success": true,
  "collected": 10
}
```

#### POST /collector/run-all
Run all collectors.

**Response:**
```json
{
  "amazon": 15,
  "aliexpress": 20,
  "rss": 10,
  "total": 45
}
```

### Statistics

#### GET /stats
Get system statistics.

**Response:**
```json
{
  "total": 150,
  "posted": 45,
  "notPosted": 105,
  "bySource": [
    { "_id": "amazon", "count": 60 },
    { "_id": "aliexpress", "count": 70 },
    { "_id": "rss", "count": 20 }
  ],
  "byCategory": [
    { "_id": "electronics", "count": 80 },
    { "_id": "fashion", "count": 40 },
    { "_id": "home", "count": 30 }
  ],
  "avgDiscount": 22.5
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200`: Success
- `201`: Created
- `404`: Not Found
- `500`: Internal Server Error

