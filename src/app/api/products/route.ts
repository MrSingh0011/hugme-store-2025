import { NextResponse } from 'next/server';
import { shopifyFetch, PRODUCTS_QUERY } from '@/lib/shopify';
import { Product } from '@/types';

// USD → INR fallback rate (override with live API if needed)
const USD_TO_INR = 83;

interface ShopifyProductsData {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        productType: string;
        priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
        compareAtPriceRange: { minVariantPrice: { amount: string; currencyCode: string } };
        images: { edges: Array<{ node: { url: string; altText: string | null } }> };
        variants: { edges: Array<{ node: { id: string; sku: string } }> };
        metafields: Array<{ key: string; value: string } | null>;
      };
    }>;
  };
}

function getMeta(metafields: Array<{ key: string; value: string } | null>, key: string) {
  return metafields?.find(m => m?.key === key)?.value ?? null;
}

function mapType(productType: string): Product['type'] {
  const t = productType.toLowerCase();
  if (t.includes('jacket')) return 'jacket';
  if (t.includes('bag')) return 'bag';
  return 'accessory';
}

export async function GET() {
  try {
    const data = await shopifyFetch<ShopifyProductsData>(PRODUCTS_QUERY, { first: 24 });

    const products: Product[] = data.products.edges.map(({ node }, index) => {
      const priceUSD = parseFloat(node.priceRange.minVariantPrice.amount);
      const mrpUSD = parseFloat(node.compareAtPriceRange.minVariantPrice.amount) || priceUSD * 1.4;
      const sku = node.variants.edges[0]?.node.sku ?? `SKU-${index + 1}`;
      const image = node.images.edges[0]?.node.url ?? null;
      const metafields = node.metafields ?? [];

      const swatchRaw = getMeta(metafields, 'swatch_colors');
      const colors = swatchRaw ? JSON.parse(swatchRaw) : ['#1a1a1a'];
      const badgeRaw = getMeta(metafields, 'badge');
      const badge = (badgeRaw === 'sale' || badgeRaw === 'new') ? badgeRaw : null;

      return {
        id: index + 1,
        shopifyId: node.id,
        name: node.title,
        sku,
        type: mapType(node.productType),
        colors,
        priceINR: Math.round(priceUSD * USD_TO_INR),
        priceMRP: Math.round(mrpUSD * USD_TO_INR),
        priceUSD,
        badge,
        emoji: node.title.slice(0, 2).toUpperCase(),
        bg: getMeta(metafields, 'bg_gradient') ?? 'linear-gradient(135deg,#1a1a1a,#3d2314)',
        sold: parseInt(getMeta(metafields, 'sold_count') ?? '0'),
        viewing: parseInt(getMeta(metafields, 'viewing_count') ?? '0'),
        image: image ?? undefined,
        handle: node.handle,
      };
    });

    return NextResponse.json(products);
  } catch (err) {
    console.error('Shopify fetch failed:', err);
    // Fallback to static data if Shopify not configured
    const { products } = await import('@/data/products');
    return NextResponse.json(products);
  }
}
