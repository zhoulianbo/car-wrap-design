type LedgerCredit = {
  id: string;
  transactionNo: string;
  transactionType: string;
  credits: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  deletedAt: Date | null;
  consumedDetail: string | null;
  metadata?: string | null;
};

export function compareCreditTransactions(a: LedgerCredit, b: LedgerCredit) {
  return (
    a.createdAt.getTime() - b.createdAt.getTime() ||
    // Coarse timestamp precision can tie a grant and its first debit.
    Number(a.transactionType !== 'grant') -
      Number(b.transactionType !== 'grant') ||
    a.transactionNo.localeCompare(b.transactionNo, 'en', { numeric: true }) ||
    a.id.localeCompare(b.id)
  );
}

/** Reconstruct account balances, never the mutable remainder of a grant. */
export function creditHistoryBalances(rows: LedgerCredit[]) {
  type Event = {
    at: number;
    kind: 'transaction' | 'refund' | 'expire' | 'reserve' | 'release';
    row: LedgerCredit;
  };
  const events: Event[] = [];
  for (const row of rows) {
    let reservedAt = NaN;
    try {
      reservedAt = Date.parse(JSON.parse(row.metadata || '{}').reservedAt);
    } catch {
      /* Legacy records. */
    }
    if (
      row.transactionType === 'reserve' ||
      (row.transactionType === 'consume' && Number.isFinite(reservedAt))
    ) {
      events.push({
        // SQLite timestamps can round a same-second settlement below reservedAt.
        at: Number.isFinite(reservedAt)
          ? Math.min(reservedAt, row.createdAt.getTime())
          : row.createdAt.getTime(),
        kind: 'reserve',
        row,
      });
      if (row.transactionType === 'reserve') {
        if (row.status === 'deleted')
          events.push({ at: row.updatedAt.getTime(), kind: 'release', row });
        continue;
      }
    }
    events.push({ at: row.createdAt.getTime(), kind: 'transaction', row });
    if (row.transactionType === 'grant') {
      const end = Math.min(
        row.expiresAt?.getTime() ?? Infinity,
        row.deletedAt?.getTime() ?? Infinity,
        row.status === 'deleted' ? row.updatedAt.getTime() : Infinity
      );
      if (Number.isFinite(end)) events.push({ at: end, kind: 'expire', row });
    } else if (row.transactionType === 'consume' && row.status === 'deleted') {
      // revoke() restores the original grant buckets and timestamps this update.
      events.push({ at: row.updatedAt.getTime(), kind: 'refund', row });
    }
  }
  const eventOrder = {
    expire: 0,
    transaction: 1,
    reserve: 2,
    refund: 4,
    release: 4,
  };
  const rank = (event: Event) =>
    event.kind === 'transaction' && event.row.transactionType !== 'grant'
      ? 3
      : eventOrder[event.kind];
  events.sort(
    (a, b) =>
      a.at - b.at ||
      rank(a) - rank(b) ||
      compareCreditTransactions(a.row, b.row)
  );
  const grants = new Map<string, { amount: number; end: number }>();
  const allocations = new Map<
    string,
    { creditId: string; creditsConsumed: number }[]
  >();
  const balances = new Map<string, number>();
  let balance = 0;
  for (const { at, kind, row } of events) {
    if (kind === 'expire') {
      const bucket = grants.get(row.id);
      if (bucket) {
        balance -= bucket.amount;
        bucket.amount = 0;
        bucket.end = at;
      }
      continue;
    }
    if (kind === 'refund' || kind === 'release') {
      for (const item of allocations.get(row.id) ?? []) {
        const bucket = grants.get(item.creditId);
        if (bucket && bucket.end > at) {
          bucket.amount += item.creditsConsumed;
          if (kind === 'refund') balance += item.creditsConsumed;
        } else if (kind === 'release') balance -= item.creditsConsumed;
      }
      continue;
    }
    if (row.transactionType === 'grant') {
      const end = Math.min(
        row.expiresAt?.getTime() ?? Infinity,
        row.deletedAt?.getTime() ?? Infinity,
        row.status === 'deleted' ? row.updatedAt.getTime() : Infinity
      );
      const amount = end > at ? row.credits : 0;
      grants.set(row.id, { amount, end });
      balance += amount;
    } else if (row.transactionType === 'consume' || kind === 'reserve') {
      if (kind === 'transaction' && allocations.has(row.id)) {
        balance += row.credits;
        balances.set(row.id, balance);
        continue;
      }
      let items: { creditId: string; creditsConsumed: number }[] = [];
      try {
        const parsed = JSON.parse(row.consumedDetail || '[]');
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        /* Older records may have no allocation details. */
      }
      if (!items.length) {
        let needed = -row.credits;
        for (const [creditId, bucket] of [...grants].sort(
          (a, b) => a[1].end - b[1].end
        )) {
          const used = Math.min(needed, bucket.amount);
          if (used > 0) items.push({ creditId, creditsConsumed: used });
          needed -= used;
          if (needed <= 0) break;
        }
      }
      allocations.set(row.id, items);
      for (const item of items) {
        const bucket = grants.get(item.creditId);
        if (bucket) bucket.amount -= item.creditsConsumed;
      }
      if (kind !== 'reserve') balance += row.credits;
    }
    balances.set(row.id, balance);
  }
  return balances;
}
