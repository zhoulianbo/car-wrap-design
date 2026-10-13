/** Isolated pricing, local offer and payment-callback regression checks.
 * Run: node --import tsx scripts/verify-credit-packs.ts
 * No real users, checkout requests, payments, or uploads.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';

import {
  getPricingProduct,
  listPricingProducts,
  trialOfferConfig,
} from '../src/config/pricing';
import {
  creditOfferKey,
  isCreditOfferActive,
  isTrialCheckoutAllowed,
  readCreditOffer,
  TRIAL_OFFER_DURATION_MS,
  updateCreditOffer,
} from '../src/lib/credit-offer';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
};
const now = 1_800_000_000_000;
for (let i = 1; i < trialOfferConfig.closeThreshold; i++) {
  const state = updateCreditOffer(storage, 'closer', 'close', false, now)!;
  assert.equal(
    isCreditOfferActive(state, now),
    false,
    `no offer on close ${i}`
  );
}
const qualified = updateCreditOffer(storage, 'closer', 'close', false, now)!;
assert.equal(qualified.expiresAt, now + TRIAL_OFFER_DURATION_MS);
assert.equal(isCreditOfferActive(qualified, now), true);
assert.equal(readCreditOffer(storage, 'other-account').closes, 0);
assert.equal(
  readCreditOffer(storage, 'closer').expiresAt,
  qualified.expiresAt,
  'reload preserves deadline'
);
assert.equal(
  updateCreditOffer(storage, 'closer', 'close', false, now + 1000)!.expiresAt,
  qualified.expiresAt,
  'repeat close cannot extend deadline'
);
updateCreditOffer(storage, 'closer', 'dismiss', false, now + 2000);
assert.equal(
  isCreditOfferActive(readCreditOffer(storage, 'closer'), now + 2000),
  false,
  'dismissed offer stays hidden on reload'
);
updateCreditOffer(storage, 'closer', 'purchase', false, now + 2500);
assert.equal(readCreditOffer(storage, 'closer').dismissed, true);
const reopened = updateCreditOffer(
  storage,
  'closer',
  'close',
  false,
  now + 3000
)!;
assert.equal(isCreditOfferActive(reopened, now + 3000), true);
assert.equal(
  reopened.expiresAt,
  qualified.expiresAt,
  'reopening preserves deadline'
);
updateCreditOffer(storage, 'closer', 'dismiss', false, now + 4000);
assert.equal(
  updateCreditOffer(storage, 'closer', 'close', true, now + 5000)!.dismissed,
  true,
  'paid users cannot reopen a dismissed offer'
);
const expiredDismissed = updateCreditOffer(
  storage,
  'closer',
  'close',
  false,
  now + TRIAL_OFFER_DURATION_MS
)!;
assert.equal(
  isCreditOfferActive(expiredDismissed, now + TRIAL_OFFER_DURATION_MS),
  false
);
assert.equal(
  expiredDismissed.expiresAt,
  qualified.expiresAt,
  'dismissed offers cannot restart after expiry'
);
for (let i = 0; i < trialOfferConfig.purchaseClickThreshold; i++) {
  updateCreditOffer(storage, 'buyer', 'purchase', false, now);
}
assert.equal(
  readCreditOffer(storage, 'buyer').expiresAt,
  null,
  'purchases alone do not open offer'
);
const buyer = updateCreditOffer(storage, 'buyer', 'close', false, now)!;
assert.equal(
  isCreditOfferActive(buyer, now),
  true,
  'configured purchase clicks qualify on close'
);
assert.equal(isCreditOfferActive(buyer, now + TRIAL_OFFER_DURATION_MS), false);
assert.equal(
  isCreditOfferActive(
    updateCreditOffer(
      storage,
      'buyer',
      'close',
      false,
      now + TRIAL_OFFER_DURATION_MS + 1
    )!,
    now + TRIAL_OFFER_DURATION_MS + 1
  ),
  false,
  'expired offers never restart'
);
for (let i = 0; i < trialOfferConfig.closeThreshold + 2; i++)
  updateCreditOffer(storage, 'paid', 'close', true, now);
assert.equal(readCreditOffer(storage, 'paid').expiresAt, null);
const blockedStorage = {
  getItem() {
    throw new Error('disabled');
  },
  setItem() {
    throw new Error('disabled');
  },
};
assert.equal(
  updateCreditOffer(blockedStorage, 'blocked', 'close', false, now),
  null
);
storage.setItem(creditOfferKey('malformed'), '{bad');
assert.equal(readCreditOffer(storage, 'malformed').closes, 0);
assert.equal(
  isTrialCheckoutAllowed(false, now + TRIAL_OFFER_DURATION_MS, now),
  true
);
for (const [paid, expires] of [
  [true, now + 1000],
  [false, now],
  [false, now + TRIAL_OFFER_DURATION_MS + 1],
  [false, 'tomorrow'],
  [false, undefined],
] as const) {
  assert.equal(isTrialCheckoutAllowed(paid, expires, now), false);
}
assert.deepEqual(
  listPricingProducts().map((p) => [
    p.productId,
    p.priceInCents,
    p.credits,
    p.creditsValidDays,
  ]),
  [
    ['credits_100', 499, 100, 0],
    ['credits_250', 999, 250, 0],
    ['credits_1000', 2999, 1000, 0],
  ]
);
const trial = getPricingProduct('credits_trial_20')!;
assert.equal(trial.priceInCents, 200);
assert.equal(trial.credits, 20);
assert.equal(trial.paywallOnly, true);
assert.equal(getPricingProduct('credits_600'), null);

const directory = mkdtempSync(join(tmpdir(), 'credit-packs-check-'));
process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DB_SINGLETON_ENABLED = 'true';
const client = createClient({ url: process.env.DATABASE_URL });
const ddl = execFileSync(
  'pnpm',
  [
    'exec',
    'drizzle-kit',
    'export',
    '--dialect',
    'sqlite',
    '--schema',
    'src/config/db/schema.sqlite.ts',
  ],
  { encoding: 'utf8' }
);
await client.executeMultiple(ddl);
const { db } = await import('../src/core/db');
const { user, order, credit, config } = await import('../src/config/db/schema');
const { handlePaymentCallback, handleWebhook, hasUserPaid } =
  await import('../src/modules/payment/service');
const { getBalance, consume: consumeCredits } =
  await import('../src/modules/credits/service');
const { StripeProvider } = await import('../src/core/payment/stripe');
const { PaymentManager } = await import('../src/core/payment');
const { buildWaffoPaymentEvent } = await import('../src/core/payment/waffo');
const { WebhookEventType } = await import('@waffo/pancake-ts');
const { localizeUrl } = await import('../src/paraglide/runtime.js');
for (const locale of ['en', 'zh'] as const) {
  const target = localizeUrl(
    new URL('/ai-car-wrap-generator?reference=test', 'https://example.test'),
    { locale }
  );
  assert.equal(
    target.pathname,
    locale === 'zh' ? '/zh/ai-car-wrap-generator' : '/ai-car-wrap-generator'
  );
  assert.equal(target.search, '?reference=test');
}
const { PaymentStatus } = await import('../src/core/payment/types');
await db()
  .insert(config)
  .values({ name: 'stripe_secret_key', value: 'test-only-placeholder' });
const original = StripeProvider.prototype.getPaymentSession;
const originalEvent = PaymentManager.prototype.getPaymentEvent;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  throw new Error('Network requests are forbidden in this regression check');
};
try {
  const waffoId = 'test-waffo-merchant-order';
  await db()
    .insert(user)
    .values({ id: waffoId, name: 'Test', email: 'waffo@example.test' });
  await db().insert(order).values({
    id: waffoId,
    orderNo: waffoId,
    userId: waffoId,
    status: 'created',
    amount: 200,
    currency: 'usd',
    paymentProvider: 'waffo',
    paymentSessionId: 'different-checkout-session-id',
    checkoutInfo: '{}',
    creditsAmount: 20,
    creditsValidDays: 0,
  });
  // Model the payload AFTER SDK signature verification, without real payments.
  const waffoEvent = buildWaffoPaymentEvent({
    eventType: WebhookEventType.OrderCompleted,
    timestamp: new Date().toISOString(),
    data: {
      orderId: 'provider-order-id',
      orderMerchantExternalId: waffoId,
      buyerEmail: 'waffo@example.test',
      currency: 'USD',
      amount: '2.00',
      taxAmount: '0',
      productName: '20 Credits',
      paymentId: 'test-payment',
    },
  } as any);
  PaymentManager.prototype.getPaymentEvent = async () => waffoEvent;
  const webhook = {
    req: new Request('https://example.test/api/payment/notify/waffo', {
      method: 'POST',
    }),
    provider: 'waffo',
  };
  await handleWebhook(webhook);
  await handleWebhook(webhook);
  assert.equal(await hasUserPaid(waffoId), true);
  assert.equal(
    await getBalance(waffoId),
    20,
    'Waffo merchant ID match grants once'
  );
  assert.equal(
    (await db().select().from(order).where(eq(order.id, waffoId)))[0].status,
    'paid'
  );
  waffoEvent.paymentSession!.metadata = { order_no: 'unknown-order' };
  await assert.rejects(handleWebhook(webhook), /order not found/);
  for (const product of [...listPricingProducts(), trial]) {
    const id = `test-${product.productId}`;
    await db()
      .insert(user)
      .values({ id, name: 'Test user', email: `${id}@example.test` });
    assert.equal(await hasUserPaid(id), false);
    await db().insert(order).values({
      id,
      orderNo: id,
      userId: id,
      status: 'created',
      amount: product.priceInCents,
      currency: 'usd',
      productId: product.productId,
      paymentProvider: 'stripe',
      paymentSessionId: id,
      checkoutInfo: '{}',
      paymentType: 'one-time',
      creditsAmount: product.credits,
      creditsValidDays: product.creditsValidDays,
    });
    StripeProvider.prototype.getPaymentSession = async () =>
      ({
        paymentStatus: PaymentStatus.SUCCESS,
        paymentResult: { id },
        paymentInfo: {
          paymentAmount: product.priceInCents,
          paymentCurrency: 'usd',
        },
      }) as any;
    await handlePaymentCallback(id);
    assert.equal(await hasUserPaid(id), true);
    assert.equal(await getBalance(id), product.credits);
    const grants = await db()
      .select()
      .from(credit)
      .where(eq(credit.userId, id));
    assert.equal(grants.length, 1);
    assert.equal(grants[0].expiresAt, null);
    await handlePaymentCallback(id);
    assert.equal(
      await getBalance(id),
      product.credits,
      'duplicate callback does not grant twice'
    );
    await consumeCredits({
      userId: id,
      credits: product.credits,
      scene: 'test',
      description: 'regression check',
    });
    assert.equal(await getBalance(id), 0);
    assert.equal(
      await hasUserPaid(id),
      true,
      'paid entitlement survives zero balance'
    );
  }
  for (const status of [PaymentStatus.FAILED, PaymentStatus.CANCELED]) {
    const id = `test-${status}`;
    await db()
      .insert(user)
      .values({ id, name: 'Test user', email: `${id}@example.test` });
    await db().insert(order).values({
      id,
      orderNo: id,
      userId: id,
      status: 'created',
      amount: 499,
      currency: 'usd',
      paymentProvider: 'stripe',
      paymentSessionId: id,
      checkoutInfo: '{}',
      creditsAmount: 100,
    });
    StripeProvider.prototype.getPaymentSession = async () =>
      ({ paymentStatus: status, paymentResult: { id } }) as any;
    await handlePaymentCallback(id);
    assert.equal(await hasUserPaid(id), false);
    assert.equal(await getBalance(id), 0);
  }
  // A deployment backfill must recognize old successful orders without marking failed users paid.
  await db()
    .update(user)
    .set({ isPaid: false })
    .where(eq(user.id, 'test-credits_100'));
  const migration = readFileSync(
    'scripts/migrations/20261010-user-paid.sql',
    'utf8'
  );
  await client.executeMultiple(
    migration.slice(migration.indexOf('UPDATE user'))
  );
  assert.equal(await hasUserPaid('test-credits_100'), true);
  assert.equal(await hasUserPaid(`test-${PaymentStatus.FAILED}`), false);
} finally {
  StripeProvider.prototype.getPaymentSession = original;
  PaymentManager.prototype.getPaymentEvent = originalEvent;
  globalThis.fetch = originalFetch;
  client.close();
}
console.log(
  'PASS: pack prices, never-expiring credits, paid entitlement, duplicate/failed callbacks, per-account thresholds, countdown, dismissal and expiry. No external provider requests.'
);
