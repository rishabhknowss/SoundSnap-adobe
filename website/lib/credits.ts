// 1 credit = $0.01 (1 cent)
// ThinkSound: $0.001/compute-second → with 80% margin = $0.0018/sec = 0.18 credits/sec

export const COST_PER_COMPUTE_SECOND = 0.001; // fal.ai base cost
export const MARGIN = 0.80; // 80% markup
export const PRICE_PER_SECOND_USD = COST_PER_COMPUTE_SECOND * (1 + MARGIN); // $0.0018
export const CREDITS_PER_SECOND = PRICE_PER_SECOND_USD * 100; // 0.18 credits/sec
export const MIN_CREDITS_REQUIRED = 5; // minimum to start a generation (~28 sec of compute)
export const COMPUTE_MULTIPLIER = 4; // compute time ≈ video duration × 4 (conservative estimate)

export function calculateCredits(computeSeconds: number): number {
  const raw = computeSeconds * CREDITS_PER_SECOND;
  return Math.max(1, Math.ceil(raw)); // minimum 1 credit charge
}

export function estimateCost(computeSeconds: number): { credits: number; usd: number } {
  const credits = calculateCredits(computeSeconds);
  return { credits, usd: credits / 100 };
}

export function estimateFromDuration(videoDurationSeconds: number): { estimatedCompute: number; estimatedCredits: number } {
  const estimatedCompute = videoDurationSeconds * COMPUTE_MULTIPLIER;
  const estimatedCredits = calculateCredits(estimatedCompute);
  return { estimatedCompute, estimatedCredits };
}

export const CREDIT_PACKS = [
  { id: "pack_500", name: "Starter", credits: 500, price: 499, currency: "USD", productId: process.env.DODO_PRODUCT_5 || "" },
  { id: "pack_1200", name: "Creator", credits: 1200, price: 1199, currency: "USD", productId: process.env.DODO_PRODUCT_15 || "" },
  { id: "pack_3000", name: "Studio", credits: 3000, price: 2999, currency: "USD", productId: process.env.DODO_PRODUCT_50 || "" },
] as const;

export function getPacksForClient() {
  return CREDIT_PACKS.map(({ id, name, credits, price, currency }) => ({
    id,
    name,
    credits,
    price,
    currency,
    displayPrice: `$${(price / 100).toFixed(2)}`,
    perCredit: `$${(price / 100 / credits).toFixed(3)}`,
    estimatedGenerations: `~${Math.floor(credits / 10)}-${Math.floor(credits / 5)}`, // rough estimate for 28-55 sec compute
  }));
}
