import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  or,
  sql,
  sum,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { AtomicConflictError, D1AtomicPlan, isD1 } from '@/core/db/atomic';
import { credit } from '@/config/db/schema';
import {
  compareCreditTransactions,
  creditHistoryBalances,
} from '@/lib/credit-ledger';
import { getSnowId, getUuid } from '@/lib/hash';

// --- Enums ---

export enum CreditStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum CreditTransactionType {
  GRANT = 'grant',
  CONSUME = 'consume',
  RESERVE = 'reserve',
}

export enum CreditTransactionScene {
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  RENEWAL = 'renewal',
  GIFT = 'gift',
  REWARD = 'reward',
}

type NewCredit = typeof credit.$inferInsert;

// --- Expiration ---

export function calculateCreditExpirationTime(params: {
  creditsValidDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  const { creditsValidDays, currentPeriodEnd } = params;

  if (!creditsValidDays || creditsValidDays <= 0) {
    return null; // never expires
  }

  if (currentPeriodEnd) {
    return new Date(currentPeriodEnd.getTime());
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + creditsValidDays);
  return expiresAt;
}

function validCreditConditions(userId: string) {
  const now = new Date();
  return and(
    eq(credit.userId, userId),
    eq(credit.transactionType, CreditTransactionType.GRANT),
    eq(credit.status, CreditStatus.ACTIVE),
    gt(credit.remainingCredits, 0),
    or(isNull(credit.expiresAt), gt(credit.expiresAt, now))
  );
}

// --- Balance ---

export async function getBalance(userId: string): Promise<number> {
  const [result] = await db()
    .select({ total: sum(credit.remainingCredits) })
    .from(credit)
    .where(validCreditConditions(userId));

  return parseInt(result?.total || '0');
}

// --- Grant ---

export async function grant(params: {
  userId: string;
  userEmail?: string;
  credits: number;
  description?: string;
  orderNo?: string;
  subscriptionNo?: string;
  scene?: string;
  expiresAt?: Date | null;
  transactionNo?: string;
}) {
  const newCredit: NewCredit = {
    id: getUuid(),
    userId: params.userId,
    userEmail: params.userEmail || '',
    transactionNo: params.transactionNo || getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: params.scene || CreditTransactionScene.GIFT,
    credits: params.credits,
    remainingCredits: params.credits,
    status: CreditStatus.ACTIVE,
    description: params.description || 'Grant credit',
    orderNo: params.orderNo || '',
    subscriptionNo: params.subscriptionNo || '',
    expiresAt: params.expiresAt !== undefined ? params.expiresAt : null,
  };

  await db().insert(credit).values(newCredit);
  return newCredit;
}

// --- Consume (FIFO with batching) ---

export async function consume(params: {
  userId: string;
  userEmail?: string;
  credits: number;
  scene?: string;
  description?: string;
  metadata?: string;
  tx?: any;
  reservation?: boolean;
}): Promise<{ success: boolean; consumedCredit?: any }> {
  if (isD1() && !params.tx) {
    for (let attempt = 0; ; attempt++) {
      const plan = new D1AtomicPlan();
      const prepared = await prepareD1Consumption(params, plan);
      if (!prepared.success) return { success: false };
      try {
        await plan.commit(prepared.queries);
        return { success: true, consumedCredit: prepared.consumedCredit };
      } catch (error) {
        if (!(error instanceof AtomicConflictError) || attempt >= 2)
          throw error;
      }
    }
  }
  const {
    userId,
    userEmail,
    credits: amount,
    scene,
    description,
    metadata,
    tx,
  } = params;
  const now = new Date();

  const execute = async (tx: any) => {
    // 1. Check balance
    const [balance] = await tx
      .select({ total: sum(credit.remainingCredits) })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          or(isNull(credit.expiresAt), gt(credit.expiresAt, now))
        )
      );

    if (!balance?.total || parseInt(balance.total) < amount) {
      return { success: false };
    }

    // 2. FIFO consumption with batching
    let remainingToConsume = amount;
    const batchSize = 1000;
    const maxBatches = 10;
    let batchNo = 0;
    const consumedItems: any[] = [];

    while (remainingToConsume > 0 && batchNo < maxBatches) {
      const batchCredits = await tx
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE),
            gt(credit.remainingCredits, 0),
            or(isNull(credit.expiresAt), gt(credit.expiresAt, now))
          )
        )
        .orderBy(asc(credit.expiresAt))
        .limit(batchSize)
        .for('update');

      if (!batchCredits || batchCredits.length === 0) break;

      for (const item of batchCredits) {
        if (remainingToConsume <= 0) break;
        const toConsume = Math.min(remainingToConsume, item.remainingCredits);

        const [allocated] = await tx
          .update(credit)
          .set({ remainingCredits: item.remainingCredits - toConsume })
          .where(
            and(
              eq(credit.id, item.id),
              eq(credit.remainingCredits, item.remainingCredits)
            )
          )
          .returning({ id: credit.id });
        if (!allocated) throw new Error('Credits changed; please retry');

        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: item.remainingCredits - toConsume,
        });

        remainingToConsume -= toConsume;
      }

      batchNo++;
    }

    if (remainingToConsume > 0) throw new Error('Insufficient credits');

    // 3. Create consumption or reservation record
    const consumedCredit: NewCredit = {
      id: getUuid(),
      userId,
      userEmail: userEmail || '',
      transactionNo: getSnowId(),
      transactionType: params.reservation
        ? CreditTransactionType.RESERVE
        : CreditTransactionType.CONSUME,
      transactionScene: scene || '',
      status: CreditStatus.ACTIVE,
      description: description || '',
      credits: -amount,
      remainingCredits: 0,
      consumedDetail: JSON.stringify(consumedItems),
      metadata: params.reservation
        ? JSON.stringify({
            ...JSON.parse(metadata || '{}'),
            reservedAt: now.toISOString(),
          })
        : metadata || '',
    };
    await tx.insert(credit).values(consumedCredit);

    return { success: true, consumedCredit };
  };

  if (tx) return execute(tx);
  return db().transaction(execute);
}

export async function reserve(
  params: Omit<Parameters<typeof consume>[0], 'reservation'>
) {
  return consume({ ...params, reservation: true });
}

/** Convert a hold into a debit; its source buckets were already allocated. */
export async function settleReservation(id: string, tx: any) {
  const [settled] = await tx
    .update(credit)
    .set({
      transactionType: CreditTransactionType.CONSUME,
      createdAt: new Date(),
    })
    .where(
      and(
        eq(credit.id, id),
        eq(credit.transactionType, CreditTransactionType.RESERVE),
        eq(credit.status, CreditStatus.ACTIVE)
      )
    )
    .returning({ id: credit.id });
  if (settled) return;
  // Compatibility with tasks submitted before reservation-based billing.
  const [existing] = await tx
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.id, id),
        eq(credit.transactionType, CreditTransactionType.CONSUME),
        eq(credit.status, CreditStatus.ACTIVE)
      )
    )
    .limit(1);
  if (!existing) throw new Error('Credit reservation is unavailable');
}

export async function getFrozenBalance(userId: string): Promise<number> {
  const [row] = await db()
    .select({ total: sum(credit.credits) })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.RESERVE),
        eq(credit.status, CreditStatus.ACTIVE)
      )
    );
  return Math.max(0, -Number(row?.total || 0));
}

// --- Revoke (release a reservation or restore a legacy debit) ---

export async function revoke(consumeCreditId: string, transaction?: any) {
  if (isD1() && !transaction) {
    for (let attempt = 0; ; attempt++) {
      const plan = new D1AtomicPlan();
      const queries = await prepareD1Revocation(consumeCreditId, plan);
      if (!queries.length) return false;
      try {
        await plan.commit(queries);
        return true;
      } catch (error) {
        if (!(error instanceof AtomicConflictError) || attempt >= 2)
          throw error;
      }
    }
  }
  const execute = async (tx: any) => {
    // Claim the consumption record first. Concurrent retries that do not win
    // this conditional update cannot restore the same source credits again.
    const [consumeRecord] = await tx
      .update(credit)
      .set({ status: CreditStatus.DELETED })
      .where(
        and(
          eq(credit.id, consumeCreditId),
          inArray(credit.transactionType, [
            CreditTransactionType.CONSUME,
            CreditTransactionType.RESERVE,
          ]),
          eq(credit.status, CreditStatus.ACTIVE)
        )
      )
      .returning({ consumedDetail: credit.consumedDetail });

    if (!consumeRecord?.consumedDetail) return false;
    const items = JSON.parse(consumeRecord.consumedDetail);

    // Atomic increment per source grant — no read-modify-write race.
    for (const item of items) {
      await tx
        .update(credit)
        .set({
          remainingCredits: sql`${credit.remainingCredits} + ${item.creditsConsumed}`,
        })
        .where(eq(credit.id, item.creditId));
    }
    return true;
  };
  return transaction ? execute(transaction) : db().transaction(execute);
}

/** Build a debit/hold into the caller's D1 batch, never commit it separately. */
export async function prepareD1Consumption(
  params: Parameters<typeof consume>[0],
  plan: Pick<D1AtomicPlan, 'read'>
) {
  if (!Number.isSafeInteger(params.credits) || params.credits <= 0) {
    throw new Error('Invalid credit amount');
  }
  const grants = await plan.read(
    db()
      .select()
      .from(credit)
      .where(validCreditConditions(params.userId))
      .orderBy(asc(credit.expiresAt), asc(credit.id))
      .limit(10000)
  );
  let remaining = params.credits;
  const details = [];
  const queries = [];
  for (const item of grants) {
    if (remaining <= 0) break;
    const allocated = Math.min(remaining, item.remainingCredits);
    details.push({
      creditId: item.id,
      transactionNo: item.transactionNo,
      creditsConsumed: allocated,
      creditsBefore: item.remainingCredits,
      creditsAfter: item.remainingCredits - allocated,
    });
    queries.push(
      db()
        .update(credit)
        .set({ remainingCredits: item.remainingCredits - allocated })
        .where(eq(credit.id, item.id))
    );
    remaining -= allocated;
  }
  if (remaining > 0)
    return { success: false, queries: [], consumedCredit: undefined };
  const consumedCredit: NewCredit = {
    id: getUuid(),
    userId: params.userId,
    userEmail: params.userEmail || '',
    transactionNo: getSnowId(),
    transactionType: params.reservation
      ? CreditTransactionType.RESERVE
      : CreditTransactionType.CONSUME,
    transactionScene: params.scene || '',
    status: CreditStatus.ACTIVE,
    description: params.description || '',
    credits: -params.credits,
    remainingCredits: 0,
    consumedDetail: JSON.stringify(details),
    metadata: params.reservation
      ? JSON.stringify({
          ...JSON.parse(params.metadata || '{}'),
          reservedAt: new Date().toISOString(),
        })
      : params.metadata || '',
  };
  queries.push(db().insert(credit).values(consumedCredit));
  return { success: true, queries, consumedCredit };
}

/** Claim a refund and restore its source grants in one guarded D1 batch. */
export async function prepareD1Revocation(
  id: string,
  plan: Pick<D1AtomicPlan, 'read'>
): Promise<any[]> {
  const [record] = await plan.read(
    db()
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.id, id),
          inArray(credit.transactionType, [
            CreditTransactionType.CONSUME,
            CreditTransactionType.RESERVE,
          ]),
          eq(credit.status, CreditStatus.ACTIVE)
        )
      )
      .limit(1)
  );
  if (!record?.consumedDetail) return [];
  const items = JSON.parse(record.consumedDetail);
  return [
    db()
      .update(credit)
      .set({ status: CreditStatus.DELETED })
      .where(eq(credit.id, id)),
    ...items.map((item: { creditId: string; creditsConsumed: number }) =>
      db()
        .update(credit)
        .set({
          remainingCredits: sql`${credit.remainingCredits} + ${item.creditsConsumed}`,
        })
        .where(eq(credit.id, item.creditId))
    ),
  ];
}

export async function prepareD1Settlement(
  id: string,
  plan: Pick<D1AtomicPlan, 'read'>
): Promise<any[]> {
  const [record] = await plan.read(
    db()
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.id, id),
          eq(credit.status, CreditStatus.ACTIVE),
          inArray(credit.transactionType, [
            CreditTransactionType.RESERVE,
            CreditTransactionType.CONSUME,
          ])
        )
      )
      .limit(1)
  );
  if (!record) throw new Error('Credit reservation is unavailable');
  return record.transactionType === CreditTransactionType.CONSUME
    ? []
    : [
        db()
          .update(credit)
          .set({
            transactionType: CreditTransactionType.CONSUME,
            createdAt: new Date(),
          })
          .where(eq(credit.id, id)),
      ];
}

// --- Auto-grant for new user ---

export async function grantForNewUser(params: {
  userId: string;
  userEmail?: string;
  configs: Record<string, string>;
}) {
  const { userId, userEmail, configs } = params;

  if ((configs.initial_credits_enabled || 'true') !== 'true') return;

  const [existing] = await db()
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionScene, 'signup_bonus')
      )
    )
    .limit(1);
  if (existing) return;

  const credits = parseInt(configs.initial_credits_amount || '20') || 0;
  if (credits <= 0) return;

  const validDays = parseInt(configs.initial_credits_valid_days || '30') || 0;
  const description =
    configs.initial_credits_description || 'Welcome wrap credits';

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: validDays,
  });

  return grant({
    userId,
    userEmail,
    credits,
    description,
    scene: 'signup_bonus',
    expiresAt,
    transactionNo: `signup:${userId}`,
  });
}

// --- History ---

export async function getHistory(userId: string, limit = 50) {
  return db()
    .select()
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        isNull(credit.deletedAt),
        ne(credit.transactionType, CreditTransactionType.RESERVE)
      )
    )
    .orderBy(desc(credit.createdAt))
    .limit(limit);
}

export async function getCreditHistoryPage(params: {
  userId: string;
  page: number;
  pageSize: number;
  transactionType?: string | null;
  search?: string | null;
}) {
  // Reconstruct before filtering/pagination, including expiry and refunds.
  const history: (typeof credit.$inferSelect)[] = await db()
    .select()
    .from(credit)
    .where(eq(credit.userId, params.userId));
  const balances = creditHistoryBalances(history);
  history.sort((a, b) => compareCreditTransactions(b, a));
  const search = params.search?.trim().toLowerCase();
  const filtered = history.filter(
    (row) =>
      !row.deletedAt &&
      row.transactionType !== CreditTransactionType.RESERVE &&
      (!params.transactionType ||
        row.transactionType === params.transactionType) &&
      (!search ||
        row.transactionNo.toLowerCase().includes(search) ||
        row.description?.toLowerCase().includes(search))
  );
  return {
    total: filtered.length,
    items: filtered
      .slice((params.page - 1) * params.pageSize, params.page * params.pageSize)
      .map((row) => ({
        id: row.id,
        transactionNo: row.transactionNo,
        transactionType: row.transactionType,
        transactionScene: row.transactionScene,
        credits: row.credits,
        balanceAfter: balances.get(row.id) ?? 0,
        description: row.description,
        status: row.status,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      })),
  };
}
