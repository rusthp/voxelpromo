# Affiliate Networks API Documentation

VoxelPromo supports 4 affiliate networks. This document describes how to configure and use each one.

---

## 🔗 Awin

**Description:** International affiliate network popular in Europe and Brazil.

### Configuration
```json
{
  "awin": {
    "enabled": true,
    "apiToken": "your-api-token",
    "publisherId": "your-publisher-id",
    "dataFeedApiKey": "your-data-feed-api-key"
  }
}
```

### Where to get credentials
1. **API Token**: Awin Dashboard → Account → API Credentials
2. **Publisher ID**: Shown in your Awin dashboard URL
3. **Data Feed API Key**: Toolbox → Create-a-Feed → Copy from generated URL

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/awin/test` | Test connection |
| GET | `/api/awin/advertisers` | List joined advertisers |
| GET | `/api/awin/feeds` | List available product feeds |
| POST | `/api/awin/collect` | Collect products from feeds |

### Features
- ✅ Product feeds with affiliate links pre-generated
- ✅ Automatic gzip decompression
- ✅ Filters for recently updated feeds (7 days)

---

## 🟢 Lomadee

**Description:** Popular Brazilian affiliate network with Magazine Luiza, Americanas, Submarino, etc.

### Configuration
```json
{
  "lomadee": {
    "enabled": true,
    "appToken": "your-app-token",
    "sourceId": "your-source-id"
  }
}
```

### Where to get credentials
1. **App Token**: Lomadee Developer Portal → Applications → Create App
2. **Source ID**: Traffic source identifier from your app settings

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lomadee/test` | Test connection |
| GET | `/api/lomadee/advertisers` | List advertisers |
| GET | `/api/lomadee/coupons` | Get available coupons |
| GET | `/api/lomadee/offers?keyword=...` | Search offers by keyword |
| POST | `/api/lomadee/deeplink` | Generate affiliate link |

### Example: Search offers
```bash
curl -X GET "https://your-api/api/lomadee/offers?keyword=smartphone&limit=10" \
  -H "Authorization: Bearer your-jwt"
```

---

## 🟠 Afilio

**Description:** Brazilian affiliate network.

### Configuration
```json
{
  "afilio": {
    "enabled": true,
    "apiToken": "your-api-token"
  }
}
```

### Where to get credentials
1. **API Token**: Afilio Dashboard → Settings → API Access

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/afilio/test` | Test connection |
| GET | `/api/afilio/campaigns` | List campaigns/advertisers |
| GET | `/api/afilio/coupons` | Get available coupons |
| POST | `/api/afilio/deeplink` | Generate affiliate link |

---

## 🔴 Rakuten

**Description:** International affiliate network (formerly LinkShare).

### Configuration
```json
{
  "rakuten": {
    "enabled": true,
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "sid": "your-site-id"
  }
}
```

### Where to get credentials
1. **Client ID/Secret**: Rakuten Developer Portal → Applications
2. **SID (Site ID)**: Your registered website ID in Rakuten

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rakuten/test` | Test connection |
| GET | `/api/rakuten/advertisers` | List advertisers |
| GET | `/api/rakuten/coupons` | Get available coupons |
| POST | `/api/rakuten/deeplink` | Generate affiliate link |

### Notes
- Uses OAuth 2.0 token authentication
- Token automatically refreshed when expired

---

## 📊 Configuration Summary

| Network | Required Fields | Optional |
|---------|-----------------|----------|
| **Awin** | apiToken, publisherId | dataFeedApiKey |
| **Lomadee** | appToken, sourceId | - |
| **Afilio** | apiToken | - |
| **Rakuten** | clientId, clientSecret, sid | - |

---

## 🔧 Frontend Configuration

All networks can be configured in the Settings page:
1. Go to **Settings** → **Afiliados**
2. Scroll to **Redes de Afiliados** card
3. Select the network tab (Awin, Lomadee, Afilio, Rakuten)
4. Enter credentials and enable
5. Click **Testar** to verify connection
6. Click **Salvar** to persist settings

---

## 🚀 Collection Sources

To include networks in automatic collection, update `collection.sources` in config:
```json
{
  "collection": {
    "enabled": true,
    "sources": ["amazon", "aliexpress", "mercadolivre", "awin", "lomadee", "rss"]
  }
}
```

Currently, only **Awin** supports automatic product collection via feeds. Other networks are used for:
- Coupons
- Deeplink generation
- Advertiser listing
