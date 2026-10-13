import { createPrivateKey } from 'node:crypto';
import {
  Environment,
  WaffoPancake,
  WebhookEventType,
  type CreateCheckoutSessionParams,
  type WebhookEvent,
  type WebhookEventData,
} from '@waffo/pancake-ts';

import {
  PaymentEventType,
  PaymentInterval,
  PaymentStatus,
  SubscriptionCycleType,
  SubscriptionStatus,
  type CheckoutSession,
  type PaymentConfigs,
  type PaymentEvent,
  type PaymentInfo,
  type PaymentOrder,
  type PaymentProvider,
  type PaymentSession,
  type SubscriptionInfo,
} from './types';

export interface WaffoConfigs extends PaymentConfigs {
  merchantId: string;
  privateKey: string;
  environment?: 'test' | 'prod';
  fetch?: typeof fetch;
}

export function normalizeWaffoPrivateKey(rawPrivateKey: string) {
  const normalized = rawPrivateKey.trim().replace(/\\n/g, '\n');
  if (!normalized) throw new Error('Waffo private key is empty');
  if (/-----BEGIN (?:RSA )?PUBLIC KEY-----/.test(normalized)) {
    throw new Error('Waffo checkout requires a private key, not a public key');
  }
  const isPkcs1 = normalized.includes('-----BEGIN RSA PRIVATE KEY-----');
  const isPkcs8 = normalized.includes('-----BEGIN PRIVATE KEY-----');
  const base64Body = normalized
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!base64Body || !/^[A-Za-z0-9+/]+=*$/.test(base64Body)) {
    throw new Error(
      'Waffo private key must contain a valid Base64 private key'
    );
  }
  const wrapped = base64Body.match(/.{1,64}/g)!.join('\n');
  const labels = isPkcs1
    ? ['RSA PRIVATE KEY']
    : isPkcs8
      ? ['PRIVATE KEY']
      : ['PRIVATE KEY', 'RSA PRIVATE KEY'];
  for (const label of labels) {
    const key = `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
    try {
      createPrivateKey(key);
      return key;
    } catch {
      // Try the other supported private-key container.
    }
  }
  throw new Error('Waffo private key is not a valid RSA private key');
}

function normalizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ])
  );
}

function getEventMetadata(data: WebhookEventData) {
  const metadata = { ...(data.orderMetadata || {}) } as Record<string, string>;
  if (!metadata.order_no && data.orderMerchantExternalId) {
    metadata.order_no = data.orderMerchantExternalId;
  }
  return metadata;
}

function toMinorUnits(amount: string | undefined, currency: string) {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount)) return 0;
  let fractionDigits = 2;
  try {
    fractionDigits =
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Retain the conventional two-decimal fallback.
  }
  return Math.round(numericAmount * 10 ** fractionDigits);
}

function mapBillingPeriod(billingPeriod?: string) {
  switch (billingPeriod) {
    case 'weekly':
      return { interval: PaymentInterval.WEEK, intervalCount: 1 };
    case 'monthly':
      return { interval: PaymentInterval.MONTH, intervalCount: 1 };
    case 'quarterly':
      return { interval: PaymentInterval.MONTH, intervalCount: 3 };
    case 'yearly':
      return { interval: PaymentInterval.YEAR, intervalCount: 1 };
    default:
      throw new Error(`Unknown Waffo billing period: ${billingPeriod}`);
  }
}

function mapSubscriptionStatus(status?: string) {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'canceling':
      return SubscriptionStatus.PENDING_CANCEL;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    case 'past_due':
      return SubscriptionStatus.PAUSED;
    default:
      throw new Error(`Unknown Waffo subscription status: ${status}`);
  }
}

function buildPaymentInfo(
  event: WebhookEvent<WebhookEventData>,
  cycleType?: SubscriptionCycleType
): PaymentInfo {
  const { data } = event;
  const currency = data.currency.toLowerCase();
  return {
    description: data.productName,
    transactionId: data.paymentId || event.eventId,
    amount: toMinorUnits(data.amount, currency),
    currency,
    paymentAmount: toMinorUnits(data.total || data.amount, currency),
    paymentCurrency: currency,
    paymentEmail: data.buyerEmail,
    paymentUserId: data.merchantProvidedBuyerIdentity,
    paidAt: data.paymentDate
      ? new Date(`${data.paymentDate}T00:00:00.000Z`)
      : new Date(event.timestamp),
    subscriptionCycleType: cycleType,
  };
}

function buildSubscriptionInfo(
  event: WebhookEvent<WebhookEventData>
): SubscriptionInfo {
  const { data } = event;
  if (!data.currentPeriodStart || !data.currentPeriodEnd) {
    throw new Error(`Waffo ${event.eventType} is missing subscription period`);
  }
  const { interval, intervalCount } = mapBillingPeriod(data.billingPeriod);
  const status = mapSubscriptionStatus(data.orderStatus);
  return {
    subscriptionId: data.orderId,
    planId: data.productMetadata?.planId,
    description: data.productName,
    amount: toMinorUnits(data.amount, data.currency),
    currency: data.currency.toLowerCase(),
    interval,
    intervalCount,
    currentPeriodStart: new Date(data.currentPeriodStart),
    currentPeriodEnd: new Date(data.currentPeriodEnd),
    metadata: getEventMetadata(data),
    status,
    canceledAt: data.canceledAt
      ? new Date(data.canceledAt)
      : status === SubscriptionStatus.CANCELED
        ? new Date(event.timestamp)
        : undefined,
    canceledEndAt:
      status === SubscriptionStatus.PENDING_CANCEL ||
      status === SubscriptionStatus.CANCELED
        ? new Date(data.currentPeriodEnd)
        : undefined,
  };
}

function buildPaymentSession(
  event: WebhookEvent<WebhookEventData>,
  cycleType?: SubscriptionCycleType
): PaymentSession {
  return {
    provider: 'waffo',
    paymentStatus: PaymentStatus.SUCCESS,
    paymentInfo: buildPaymentInfo(event, cycleType),
    paymentResult: event.data,
    metadata: getEventMetadata(event.data),
  };
}

function buildSubscriptionSession(
  event: WebhookEvent<WebhookEventData>,
  cycleType?: SubscriptionCycleType
): PaymentSession {
  return {
    ...buildPaymentSession(event, cycleType),
    subscriptionId: event.data.orderId,
    subscriptionInfo: buildSubscriptionInfo(event),
    subscriptionResult: event.data,
  };
}

export function buildWaffoPaymentEvent(
  event: WebhookEvent<WebhookEventData>
): PaymentEvent {
  let eventType: PaymentEventType;
  let paymentSession: PaymentSession;
  switch (event.eventType) {
    case WebhookEventType.OrderCompleted:
      eventType = PaymentEventType.CHECKOUT_SUCCESS;
      paymentSession = buildPaymentSession(event);
      break;
    case WebhookEventType.SubscriptionActivated:
      eventType = PaymentEventType.CHECKOUT_SUCCESS;
      paymentSession = buildSubscriptionSession(
        event,
        SubscriptionCycleType.CREATE
      );
      break;
    case WebhookEventType.SubscriptionRenewed:
    case WebhookEventType.SubscriptionRecovered:
      eventType = PaymentEventType.PAYMENT_SUCCESS;
      paymentSession = buildSubscriptionSession(
        event,
        SubscriptionCycleType.RENEWAL
      );
      break;
    case WebhookEventType.SubscriptionCanceled:
      eventType = PaymentEventType.SUBSCRIBE_CANCELED;
      paymentSession = buildSubscriptionSession(event);
      break;
    case WebhookEventType.SubscriptionCanceling:
    case WebhookEventType.SubscriptionUncanceled:
    case WebhookEventType.SubscriptionPastDue:
      eventType = PaymentEventType.SUBSCRIBE_UPDATED;
      paymentSession = buildSubscriptionSession(event);
      break;
    case WebhookEventType.RefundSucceeded:
      eventType = PaymentEventType.PAYMENT_REFUNDED;
      paymentSession = buildPaymentSession(event);
      break;
    default:
      eventType = PaymentEventType.EVENT_RECEIVED;
      paymentSession = {
        ...buildPaymentSession(event),
        subscriptionId: event.data.orderId,
      };
  }
  return { eventType, eventResult: event, paymentSession };
}

export class WaffoProvider implements PaymentProvider {
  readonly name = 'waffo';
  configs: WaffoConfigs;

  constructor(configs: WaffoConfigs) {
    this.configs = configs;
  }

  private getClient() {
    return new WaffoPancake({
      merchantId: this.configs.merchantId,
      privateKey: normalizeWaffoPrivateKey(this.configs.privateKey),
      environment:
        this.configs.environment === 'prod'
          ? Environment.Prod
          : Environment.Test,
      fetch: this.configs.fetch,
    });
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    if (!order.productId) throw new Error('Waffo productId is required');
    if (!order.price?.currency) throw new Error('Waffo currency is required');
    const metadata = normalizeMetadata(order.metadata);
    const payload: CreateCheckoutSessionParams = {
      productId: order.productId,
      currency: order.price.currency.toUpperCase(),
      buyerEmail: order.customer?.email,
      successUrl: order.successUrl,
      metadata,
      orderMerchantExternalId:
        order.orderNo || metadata?.order_no || order.requestId,
      darkMode: true,
    };
    const result = await this.getClient().checkout.createSession(payload);
    return {
      provider: this.name,
      checkoutParams: payload,
      checkoutInfo: {
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
      },
      checkoutResult: result,
      metadata: order.metadata || {},
    };
  }

  async getPaymentSession({ sessionId }: { sessionId: string }) {
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.PROCESSING,
      paymentResult: { sessionId },
    };
  }

  async getPaymentEvent({ req }: { req: Request }) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-waffo-signature');
    if (!rawBody || !signature)
      throw new Error('Invalid Waffo webhook request');
    const event = this.getClient().webhooks.verify<WebhookEventData>(
      rawBody,
      signature,
      {
        environment:
          this.configs.environment === 'prod'
            ? Environment.Prod
            : Environment.Test,
      }
    );
    return buildWaffoPaymentEvent(event);
  }

  async cancelSubscription({ subscriptionId }: { subscriptionId: string }) {
    const result = await this.getClient().orders.cancelSubscription({
      orderId: subscriptionId,
    });
    return {
      provider: this.name,
      subscriptionId: result.orderId,
      subscriptionResult: result,
    };
  }
}
