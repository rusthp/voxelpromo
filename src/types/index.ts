export interface Offer {
  _id?: string;
  userId?: string; // Reference to the user who owns this offer
  title: string;
  description: string;
  originalPrice: number;
  currentPrice: number;
  discount: number;
  discountPercentage: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  affiliateUrl: string;
  source:
    | 'amazon'
    | 'aliexpress'
    | 'shopee'
    | 'rss'
    | 'manual'
    | 'mercadolivre'
    | 'awin'
    | 'lomadee'
    | 'afilio'
    | 'rakuten';
  category: string;
  subcategory?: string;
  rating?: number;
  reviewsCount?: number;
  availability?: string;
  brand?: string;
  tags: string[];
  coupons?: string[]; // Array de códigos de cupom disponíveis
  isActive: boolean;
  isPosted: boolean;
  postedAt?: Date;
  postedChannels?: string[];
  aiGeneratedPost?: string;
  scheduledAt?: Date;
  shortCode?: string;
  clicks?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterOptions {
  minDiscount?: number;
  maxPrice?: number;
  minPrice?: number;
  minRating?: number;
  categories?: string[];
  sources?: string[];
  excludePosted?: boolean;
  limit?: number;
  skip?: number;
  sortBy?: string;
  search?: string; // Search by title (case-insensitive)
  userId?: string; // Filter by user Owner
}

export interface AIPostRequest {
  offer: Offer;
  tone?: 'casual' | 'professional' | 'viral' | 'urgent';
  maxLength?: number;
  includeEmojis?: boolean;
  includeHashtags?: boolean;
}

export interface AIPostResponse {
  title: string;
  description: string;
  hashtags: string[];
  emojis: string[];
  fullPost: string;
}

export interface AmazonProduct {
  ASIN: string;
  Title: string;
  ListPrice?: { Amount: number; CurrencyCode: string };
  OfferSummary?: { LowestNewPrice?: { Amount: number; CurrencyCode: string } };
  Images?: { Primary?: { Large?: { URL: string } } };
  DetailPageURL: string;
  CustomerReviews?: { StarRating?: { Value: number } };
  ItemInfo?: {
    ByLineInfo?: { Brand?: { DisplayValue: string } };
    ProductInfo?: { TotalReviews?: { TotalReviewCount: number } };
  };
}

export interface AliExpressProduct {
  product_id: string;
  product_title: string;
  product_price: {
    currency: string;
    value: string;
  };
  original_price?: {
    currency: string;
    value: string;
  };
  product_image_url: string;
  product_detail_url: string;
  shop_info?: {
    shop_name: string;
  };
  evaluation?: {
    star_rate: string;
    valid_orders: number;
  };
}
