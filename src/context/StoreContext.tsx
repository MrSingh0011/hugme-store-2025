'use client';
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CartItem, CurrencyCode, CurrencyState, Product } from '@/types';
import { CURRENCY_RATES } from '@/data/products';

interface StoreContextType {
  currency: CurrencyState;
  setCurrency: (code: CurrencyCode, symbol: string, flag: string) => void;
  formatPrice: (inr: number) => string;
  cart: CartItem[];
  addToCart: (product: Product, size?: string) => void;
  changeQty: (productId: number, delta: number) => void;
  cartOpen: boolean;
  toggleCart: () => void;
  pdpProduct: Product | null;
  openPDP: (product: Product) => void;
  closePDP: () => void;
  products: Product[];
  productsLoading: boolean;
  checkout: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyState>({ code: 'INR', symbol: '₹', flag: '🇮🇳' });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [pdpProduct, setPdpProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => import('@/data/products').then(m => setProducts(m.products)))
      .finally(() => setProductsLoading(false));
  }, []);

  const setCurrency = useCallback((code: CurrencyCode, symbol: string, flag: string) => {
    setCurrencyState({ code, symbol, flag });
  }, []);

  const formatPrice = useCallback((inr: number): string => {
    if (currency.code === 'INR') return `₹${inr.toLocaleString('en-IN')}`;
    const rate = CURRENCY_RATES[currency.code];
    const converted = inr * 0.012 * (rate / CURRENCY_RATES['USD']);
    return `${currency.symbol}${converted.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }, [currency]);

  const addToCart = useCallback((product: Product, size = 'M') => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.size === size);
      if (existing) return prev.map(i => i.product.id === product.id && i.size === size ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1, size }];
    });
    setCartOpen(true);
  }, []);

  const changeQty = useCallback((productId: number, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  }, []);

  const toggleCart = useCallback(() => setCartOpen(v => !v), []);
  const openPDP = useCallback((product: Product) => setPdpProduct(product), []);
  const closePDP = useCallback(() => setPdpProduct(null), []);

  const checkout = useCallback(async () => {
    const lines = cart
      .filter(i => (i.product as Product & { shopifyId?: string }).shopifyId)
      .map(i => ({
        variantId: (i.product as Product & { shopifyId?: string }).shopifyId!,
        quantity: i.qty,
      }));

    if (lines.length === 0) { toggleCart(); return; }

    const locale = currency.code === 'INR' ? 'en-in' : 'en-us';
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, locale }),
    });
    const { checkoutUrl, error } = await res.json();
    if (checkoutUrl) window.location.href = checkoutUrl;
    else console.error('Checkout error:', error);
  }, [cart, currency, toggleCart]);

  return (
    <StoreContext.Provider value={{ currency, setCurrency, formatPrice, cart, addToCart, changeQty, cartOpen, toggleCart, pdpProduct, openPDP, closePDP, products, productsLoading, checkout }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
