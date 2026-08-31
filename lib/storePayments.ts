export type CheckoutProduct = {
  regular_price: number;
  sale_price: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

export function activeProductPrice(product: CheckoutProduct) {
  if (product.sale_price === null || product.sale_price >= product.regular_price) {
    return product.regular_price;
  }
  const now = Date.now();
  if (product.sale_starts_at && new Date(product.sale_starts_at).getTime() > now) {
    return product.regular_price;
  }
  if (product.sale_ends_at && new Date(product.sale_ends_at).getTime() <= now) {
    return product.regular_price;
  }
  return product.sale_price;
}
