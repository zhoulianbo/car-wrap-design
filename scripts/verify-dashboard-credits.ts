/** Isolated SQLite fixtures only; no real account, storage, or provider writes. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

import { creditHistoryBalances } from '../src/lib/credit-ledger';

const date = (hour: number) => new Date(Date.UTC(2026, 9, 10, hour));
const grantRow = (
  id: string,
  credits: number,
  hour: number,
  expiresAt: Date | null = null
) => ({
  id,
  transactionNo: id,
  transactionType: 'grant',
  credits,
  status: 'active',
  createdAt: date(hour),
  updatedAt: date(hour),
  expiresAt,
  deletedAt: null,
  consumedDetail: null,
});
const rows = [
  grantRow('1', 20, 0),
  grantRow('2', 1000, 1),
  grantRow('3', 250, 2),
  {
    ...grantRow('4', -10, 3),
    transactionType: 'consume',
    consumedDetail: JSON.stringify([{ creditId: '1', creditsConsumed: 10 }]),
  },
];
assert.deepEqual(
  [...creditHistoryBalances(rows).values()],
  [20, 1020, 1270, 1260]
);
assert.deepEqual(
  [...creditHistoryBalances([...rows].reverse()).values()],
  [20, 1020, 1270, 1260]
);
const tied = rows.map((row) => ({
  ...row,
  createdAt: date(0),
  updatedAt: date(0),
}));
assert.equal(
  creditHistoryBalances(tied).get('4'),
  1260,
  'Tied timestamps process grants before their debit'
);
const expiring = [
  ...rows.map((row) => (row.id === '1' ? { ...row, expiresAt: date(4) } : row)),
  grantRow('5', 5, 5),
];
assert.equal(
  creditHistoryBalances(expiring).get('5'),
  1255,
  'Expire only the unused 10 credits'
);
const refunded = [
  ...rows.map((row) =>
    row.id === '4' ? { ...row, status: 'deleted', updatedAt: date(4) } : row
  ),
  grantRow('5', 5, 5),
];
assert.equal(
  creditHistoryBalances(refunded).get('4'),
  1260,
  'Historical debit balance is preserved'
);
assert.equal(
  creditHistoryBalances(refunded).get('5'),
  1275,
  'Refund restores the source grant'
);
const expiredRefund = expiring.map((row) =>
  row.id === '4' ? { ...row, status: 'deleted', updatedAt: date(4) } : row
);
assert.equal(
  creditHistoryBalances(expiredRefund).get('5'),
  1255,
  'Refund to expired credits is not available'
);

const reserved = {
  ...grantRow('hold', -10, 2),
  transactionType: 'reserve',
  metadata: JSON.stringify({ reservedAt: date(2).toISOString() }),
  consumedDetail: JSON.stringify([{ creditId: 'source', creditsConsumed: 10 }]),
};
assert.equal(
  creditHistoryBalances([
    grantRow('source', 20, 0, date(3)),
    {
      ...reserved,
      transactionType: 'consume',
      metadata: JSON.stringify({
        reservedAt: new Date(date(2).getTime() + 500).toISOString(),
      }),
    },
    grantRow('later', 5, 4),
  ]).get('later'),
  5,
  'same-second settlement allocates its hold only once with coarse DB timestamps'
);
assert.equal(
  creditHistoryBalances([
    grantRow('source', 20, 0),
    reserved,
    grantRow('later', 5, 3),
  ]).get('later'),
  25,
  'hold does not debit total balance'
);
assert.equal(
  creditHistoryBalances([
    grantRow('source', 20, 0, date(3)),
    { ...reserved, transactionType: 'consume', createdAt: date(4) },
    grantRow('later', 5, 5),
  ]).get('later'),
  5,
  'settlement consumes held credits even across expiry'
);
assert.equal(
  creditHistoryBalances([
    grantRow('source', 20, 0, date(3)),
    { ...reserved, status: 'deleted', updatedAt: date(4) },
    grantRow('later', 5, 5),
  ]).get('later'),
  5,
  'released expired holds do not resurrect expired credits'
);
assert.equal(
  creditHistoryBalances([
    grantRow('source', 20, 0),
    { ...reserved, status: 'deleted', updatedAt: date(4) },
    grantRow('later', 5, 5),
  ]).get('later'),
  25,
  'released valid holds preserve total balance'
);

const directory = mkdtempSync(join(tmpdir(), 'dashboard-credits-'));
process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DB_SINGLETON_ENABLED = 'true';
const client = createClient({ url: process.env.DATABASE_URL });
await client.executeMultiple(
  execFileSync(
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
  )
);
const { getCreditHistoryPage, getBalance } =
  await import('../src/modules/credits/service');
const { getWrapDashboard } = await import('../src/modules/user-wraps/service');
const {
  createAdminDesign,
  listDesignsForModeration,
  listDesignReports,
  moderateDesign,
} = await import('../src/modules/design-gallery/service');
try {
  await client.executeMultiple(
    "INSERT INTO user (id, name, email) VALUES ('owner', 'Owner', 'owner@example.test'), ('other', 'Other', 'other@example.test')"
  );
  for (const row of rows) {
    await client.execute({
      sql: 'INSERT INTO credit (id, user_id, transaction_no, transaction_type, credits, remaining_credits, status, created_at, updated_at, consumed_detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        row.id,
        'owner',
        row.transactionNo,
        row.transactionType,
        row.credits,
        row.id === '1' ? 10 : row.transactionType === 'grant' ? row.credits : 0,
        row.status,
        row.createdAt.getTime(),
        row.updatedAt.getTime(),
        row.consumedDetail,
      ],
    });
  }
  const page = await getCreditHistoryPage({
    userId: 'owner',
    page: 1,
    pageSize: 2,
  });
  assert.equal(page.total, 4);
  assert.deepEqual(
    page.items.map((row) => row.balanceAfter),
    [1260, 1270]
  );
  const next = await getCreditHistoryPage({
    userId: 'owner',
    page: 2,
    pageSize: 2,
  });
  assert.deepEqual(
    next.items.map((row) => row.balanceAfter),
    [1020, 20]
  );
  const debit = await getCreditHistoryPage({
    userId: 'owner',
    page: 1,
    pageSize: 1,
    transactionType: 'consume',
    search: '4',
  });
  assert.equal(
    debit.items[0].balanceAfter,
    1260,
    'Filters must not reset the running balance'
  );
  assert.equal(await getBalance('owner'), 1260);
  assert.equal(
    (await getCreditHistoryPage({ userId: 'other', page: 1, pageSize: 20 }))
      .total,
    0
  );
  const input = {
    ownerId: 'owner',
    vehicleSlug: 'model-3-legacy' as const,
    title: 'Saved wrap',
    publishKey: 'dashboard:test',
    textureKey: 'design/test.webp',
    textureUrl: 'https://example.test/design/test.webp',
    coverKey: 'cover/test.webp',
    coverUrl: 'https://example.test/cover/test.webp',
  };
  const design = await createAdminDesign(input);
  await client.execute({
    sql: 'UPDATE design SET view_count = 7, like_count = 3, download_count = 2 WHERE id = ?',
    args: [design.id],
  });
  // A second publication contributes counts but must not duplicate the saved wrap.
  await client.execute({
    sql: "INSERT INTO design (id, owner_id, source_wrap_id, vehicle_slug, slug, title, snapshot_json, publish_key, view_count, like_count, download_count) VALUES ('second', 'owner', ?, 'model-3-legacy', 'second', 'Second', '{}', 'second', 5, 2, 1)",
    args: [design.sourceWrapId!],
  });
  await createAdminDesign({
    ...input,
    ownerId: 'other',
    publishKey: 'dashboard:other',
  });
  const deleted = await createAdminDesign({
    ...input,
    publishKey: 'dashboard:deleted',
  });
  await client.execute({
    sql: 'UPDATE user_wrap SET deleted_at = ? WHERE id = ?',
    args: [date(3).getTime(), deleted.sourceWrapId!],
  });
  for (const status of ['succeeded', 'failed', 'processing']) {
    await client.execute({
      sql: "INSERT INTO ai_task (id, user_id, media_type, provider, model, prompt, status) VALUES (?, 'owner', 'image', 'fixture', 'fixture', 'test', ?)",
      args: [status, status],
    });
    await client.execute({
      sql: "INSERT INTO ai_generation (id, ai_task_id, user_id, vehicle_slug, template_version, mode, provider, model, prompt, idempotency_key, cost_credits, status) VALUES (?, ?, 'owner', 'model-3-legacy', 'fixture', 'text-to-image', 'fixture', 'fixture', 'test', ?, 10, ?)",
      args: [status, status, status, status],
    });
  }
  let stats = await getWrapDashboard({
    userId: 'owner',
    page: 1,
    pageSize: 12,
    utcOffset: 480,
    now: date(4),
  });
  assert.equal(stats.wrapCount, 1);
  assert.equal(stats.generationCount, 1);
  assert.equal(stats.todayConsumed, 10);
  assert.equal(stats.items.length, 1);
  assert.equal('viewCount' in stats.items[0], false);
  assert.equal('likeCount' in stats.items[0], false);
  assert.equal('downloadCount' in stats.items[0], false);
  assert.equal(
    (
      await getWrapDashboard({
        userId: 'owner',
        page: 2,
        pageSize: 1,
        utcOffset: 480,
        now: date(4),
      })
    ).items.length,
    0
  );
  assert.equal(
    (
      await getWrapDashboard({
        userId: 'owner',
        page: 1,
        pageSize: 12,
        utcOffset: -480,
        now: date(10),
      })
    ).todayConsumed,
    0,
    'Local midnight must exclude the previous day'
  );
  await client.execute("UPDATE credit SET status = 'deleted' WHERE id = '4'");
  stats = await getWrapDashboard({
    userId: 'owner',
    page: 1,
    pageSize: 12,
    utcOffset: 480,
    now: date(4),
  });
  assert.equal(stats.todayConsumed, 0, 'Refunded debits are not spending');
  await client.execute("DELETE FROM design WHERE id='second'");
  for (const status of [
    'pending',
    'approved',
    'rejected',
    'hidden',
    'reported',
  ]) {
    await moderateDesign({
      designId: design.id,
      status,
      title: `Reviewed ${status}`,
    });
    const moderated = await listDesignsForModeration({
      page: 1,
      pageSize: 20,
      status,
      search: `Reviewed ${status}`,
    });
    assert.equal(moderated.total, 1);
    assert.equal(moderated.items[0].textureUrl, input.textureUrl);
    assert.equal(moderated.items[0].coverUrl, input.coverUrl);
    assert.equal(moderated.items[0].title, `Reviewed ${status}`);
  }
  await client.execute({
    sql: "INSERT INTO design_report (id, design_id, reporter_id, reason, status, idempotency_key) VALUES ('report', ?, 'other', 'fixture', 'open', 'fixture-report')",
    args: [design.id],
  });
  const reports = await listDesignReports({
    page: 1,
    pageSize: 20,
    status: 'open',
  });
  assert.equal(reports.items[0].textureUrl, input.textureUrl);
  assert.equal(reports.items[0].coverUrl, input.coverUrl);
  console.log(
    'PASS: transaction balances, filtering/pagination, expiry/refunds, account isolation, dashboard counts, duplicate publications, local-day usage, and moderation images/title transitions'
  );
} finally {
  client.close();
}
