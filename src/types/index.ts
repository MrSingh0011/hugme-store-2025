export interface Product {
  id: number;
  shopifyId?: string;
  handle?: string;
  name: string;
  sku: string;
  type: 'jacket' | 'bag' | 'accessory';
  colors: string[];
  priceINR: number;
  priceMRP: number;
  priceUSD?: number;
  badge: 'sale' | 'new' | null;
  emoji: string;
  bg: string;
  sold: number;
  viewing: number;
  image?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  size: string;
}

export type CurrencyCode = 'INR' | 'USD' | 'GBP' | 'EUR' | 'MYR' | 'JPY' | 'AED';

export interface CurrencyState {
  code: CurrencyCode;
  symbol: string;
  flag: string;
}
