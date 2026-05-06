const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN!;
const API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;

export async function shopifyFetch<T>(query: string, variables = {}): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0].message);
  return data as T;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const PRODUCTS_QUERY = `
  query Products($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          productType
          vendor
          tags
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          compareAtPriceRange {
            minVariantPrice { amount currencyCode }
          }
          images(first: 1) {
            edges { node { url altText } }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                sku
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
                availableForSale
              }
            }
          }
          metafields(identifiers: [
            { namespace: "custom", key: "sold_count" }
            { namespace: "custom", key: "viewing_count" }
            { namespace: "custom", key: "badge" }
            { namespace: "custom", key: "bg_gradient" }
            { namespace: "custom", key: "swatch_colors" }
          ]) {
            key
            value
          }
        }
      }
    }
  }
`;

export const CREATE_CART_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]!, $buyerIdentity: CartBuyerIdentityInput) {
    cartCreate(input: { lines: $lines, buyerIdentity: $buyerIdentity }) {
      cart {
        id
        checkoutUrl
        lines(first: 20) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price { amount currencyCode }
                  product { title }
                }
              }
            }
          }
        }
        cost {
          totalAmount { amount currencyCode }
          subtotalAmount { amount currencyCode }
        }
      }
      userErrors { field message }
    }
  }
`;

export const UPDATE_CART_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        cost { totalAmount { amount currencyCode } }
      }
      userErrors { field message }
    }
  }
`;
