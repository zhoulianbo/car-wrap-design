import { trialOfferConfig } from '@/config/pricing';

// Offer activity is per account and per browser. It is deliberately not a server ledger.
export const TRIAL_OFFER_DURATION_MS = 2 * 60 * 60 * 1000;
export type CreditOfferState = {
  closes: number;
  purchaseClicks: number;
  expiresAt: number | null;
  dismissed: boolean;
};
export const creditOfferKey = (userId: string) =>
  `wrap-credit-offer:v1:${encodeURIComponent(userId)}`;
const emptyState = (): CreditOfferState => ({
  closes: 0,
  purchaseClicks: 0,
  expiresAt: null,
  dismissed: false,
});
type OfferStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readCreditOffer(
  storage: OfferStorage,
  userId: string
): CreditOfferState {
  try {
    const value = JSON.parse(storage.getItem(creditOfferKey(userId)) || 'null');
    if (!value || typeof value !== 'object') return emptyState();
    return {
      closes:
        Number.isSafeInteger(value.closes) && value.closes >= 0
          ? value.closes
          : 0,
      purchaseClicks:
        Number.isSafeInteger(value.purchaseClicks) && value.purchaseClicks >= 0
          ? value.purchaseClicks
          : 0,
      expiresAt:
        Number.isSafeInteger(value.expiresAt) && value.expiresAt > 0
          ? value.expiresAt
          : null,
      dismissed: value.dismissed === true,
    };
  } catch {
    return emptyState();
  }
}

export function isCreditOfferActive(state: CreditOfferState, now = Date.now()) {
  return !state.dismissed && state.expiresAt !== null && state.expiresAt > now;
}

export function updateCreditOffer(
  storage: OfferStorage,
  userId: string,
  action: 'close' | 'purchase' | 'dismiss',
  isPaid: boolean,
  now = Date.now()
): CreditOfferState | null {
  try {
    const state = readCreditOffer(storage, userId);
    if (action === 'purchase') state.purchaseClicks += 1;
    if (action === 'close') state.closes += 1;
    if (action === 'dismiss') state.dismissed = true;
    // Closing the regular paywall can reveal the same offer again, without
    // restarting its original two-hour window.
    if (
      action === 'close' &&
      !isPaid &&
      state.expiresAt !== null &&
      state.expiresAt > now
    ) {
      state.dismissed = false;
    }
    if (
      action === 'close' &&
      !isPaid &&
      !state.dismissed &&
      state.expiresAt === null &&
      (state.closes >= trialOfferConfig.closeThreshold ||
        state.purchaseClicks >= trialOfferConfig.purchaseClickThreshold)
    ) {
      state.expiresAt = now + TRIAL_OFFER_DURATION_MS;
    }
    storage.setItem(creditOfferKey(userId), JSON.stringify(state));
    return state;
  } catch {
    return null;
  } // Do not show an offer whose dismissal cannot be persisted.
}

export function isTrialCheckoutAllowed(
  isPaid: boolean,
  expiresAt: unknown,
  now = Date.now()
) {
  return (
    !isPaid &&
    typeof expiresAt === 'number' &&
    Number.isSafeInteger(expiresAt) &&
    expiresAt > now &&
    expiresAt <= now + TRIAL_OFFER_DURATION_MS
  );
}
