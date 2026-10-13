/**
 * Authoritative pricing catalog.
 *
 * The checkout API uses this as the SOURCE OF TRUTH for price/credits/duration.
 * Any price, credits, or plan info sent by the client is IGNORED — only the
 * product_id is honored, and everything else is looked up here.
 *
 * These defaults are intentionally small one-time credit packs for the MVP.
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';

/** Either threshold qualifies an unpaid user when they close the paywall. */
export const trialOfferConfig = {
  closeThreshold: 3,
  purchaseClickThreshold: 2,
};

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  credits: number;
  creditsValidDays?: number;
  paywallOnly?: boolean;
  plan?: PricingPlanInfo;
};

/**
 * One-time credit catalog, shared by pricing and checkout.
 * Keys MUST match what the pricing UI sends as product_id.
 */
export const pricingCatalog: Record<string, PricingProduct> = {
  credits_trial_20: {
    productId: 'credits_trial_20',
    productName: '20 Credits',
    planName: 'Trial Pack',
    description: '2 AI wrap results',
    type: PaymentType.ONE_TIME,
    priceInCents: 200,
    currency: 'usd',
    credits: 20,
    creditsValidDays: 0,
    paywallOnly: true,
  },
  credits_100: {
    productId: 'credits_100',
    productName: '100 Credits',
    planName: 'Starter Pack',
    description: '10 AI wrap results',
    type: PaymentType.ONE_TIME,
    priceInCents: 499,
    currency: 'usd',
    credits: 100,
    creditsValidDays: 0,
  },
  credits_250: {
    productId: 'credits_250',
    productName: '250 Credits',
    planName: 'Creator Pack',
    description: '25 AI wrap results',
    type: PaymentType.ONE_TIME,
    priceInCents: 999,
    currency: 'usd',
    credits: 250,
    creditsValidDays: 0,
  },
  credits_1000: {
    productId: 'credits_1000',
    productName: '1000 Credits',
    planName: 'Studio Pack',
    description: '100 AI wrap results',
    type: PaymentType.ONE_TIME,
    priceInCents: 2999,
    currency: 'usd',
    credits: 1000,
    creditsValidDays: 0,
  },
};

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog).filter(
    (product) => !product.paywallOnly
  );
}
