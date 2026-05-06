import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch, CREATE_CART_MUTATION } from '@/lib/shopify';

interface CartLine {
  variantId: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const { lines, locale } = await req.json() as { lines: CartLine[]; locale?: string };

    const buyerIdentity = locale === 'en-us'
      ? { countryCode: 'US' }
      : { countryCode: 'IN' };

    const data = await shopifyFetch<{
      cartCreate: {
        cart: { id: string; checkoutUrl: string };
        userErrors: Array<{ field: string; message: string }>;
      };
    }>(CREATE_CART_MUTATION, {
      lines: lines.map(l => ({ merchandiseId: l.variantId, quantity: l.quantity })),
      buyerIdentity,
    });

    if (data.cartCreate.userErrors.length > 0) {
      return NextResponse.json({ error: data.cartCreate.userErrors[0].message }, { status: 400 });
    }

    return NextResponse.json({
      cartId: data.cartCreate.cart.id,
      checkoutUrl: data.cartCreate.cart.checkoutUrl,
    });
  } catch (err) {
    console.error('Cart creation failed:', err);
    return NextResponse.json({ error: 'Failed to create cart' }, { status: 500 });
  }
}
