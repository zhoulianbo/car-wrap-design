/** Isolated real D1 checks. No production writes or paid provider calls. */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';

const persistPath = mkdtempSync(join(tmpdir(), 'car-wrap-d1-business-'));
const proxy = await getPlatformProxy<any>({
  configPath: 'wrangler.jsonc',
  persist: { path: persistPath },
});
process.env.DATABASE_PROVIDER = 'd1';
process.env.CONFIG_ENCRYPTION_KEY = 'isolated-business-key';
process.env.VITE_ASSETS_URL = 'https://fixture.invalid';
process.env.VITE_APP_URL = 'https://fixture.invalid';
(globalThis as any).__CF_ENV__ = proxy.env;
try {
  for (const statement of readFileSync(
    'drizzle/0000_perfect_mimic.sql',
    'utf8'
  ).split('--> statement-breakpoint')) {
    await proxy.env.DB.prepare(statement.trim()).run();
  }
  const { db } = await import('../src/core/db');
  const { D1AtomicPlan, AtomicConflictError, atomicBatch } =
    await import('../src/core/db/atomic');
  const { user, credit } = await import('../src/config/db/schema');
  const { eq } = await import('drizzle-orm');
  const credits = await import('../src/modules/credits/service');
  await db()
    .insert(user)
    .values({ id: 'test-owner', name: 'Test', email: 'test@example.invalid' });
  const empty = new D1AtomicPlan();
  assert.equal(
    (
      await empty.read(
        db().select().from(credit).where(eq(credit.userId, 'test-owner'))
      )
    ).length,
    0
  );
  await empty.commit([
    db().update(user).set({ isPaid: true }).where(eq(user.id, 'test-owner')),
  ]);
  const snapshot = new D1AtomicPlan();
  const [owner] = await snapshot.read(
    db().select().from(user).where(eq(user.id, 'test-owner'))
  );
  assert.equal(owner.isPaid, true);
  assert.ok(owner.createdAt instanceof Date);
  await db()
    .update(user)
    .set({ name: 'Changed' })
    .where(eq(user.id, 'test-owner'));
  await assert.rejects(
    snapshot.commit([
      db()
        .update(user)
        .set({ name: 'Must roll back' })
        .where(eq(user.id, 'test-owner')),
    ]),
    AtomicConflictError
  );
  assert.equal((await db().select().from(user))[0].name, 'Changed');
  await assert.rejects(
    atomicBatch((tx) => [
      tx
        .update(user)
        .set({ name: 'Rolled back' })
        .where(eq(user.id, 'test-owner')),
      tx.insert(user).values({
        id: 'test-owner',
        name: 'Duplicate',
        email: 'duplicate@example.invalid',
      }),
    ])
  );
  assert.equal((await db().select().from(user))[0].name, 'Changed');
  await credits.grant({ userId: 'test-owner', credits: 10 });
  const consumed = await Promise.all([
    credits.consume({ userId: 'test-owner', credits: 10 }),
    credits.consume({ userId: 'test-owner', credits: 10 }),
  ]);
  assert.equal(
    consumed.filter((result) => result.success).length,
    1,
    'concurrent debit cannot overspend'
  );
  assert.equal(await credits.getBalance('test-owner'), 0);
  const debit = consumed.find((result) => result.success)!.consumedCredit;
  const refunds = await Promise.all([
    credits.revoke(debit.id),
    credits.revoke(debit.id),
  ]);
  assert.equal(
    refunds.filter(Boolean).length,
    1,
    'refund applied exactly once'
  );
  assert.equal(await credits.getBalance('test-owner'), 10);
  console.log(
    'PASS: snapshots, dates/booleans, empty results, rollback, concurrent debit/refund.'
  );

  const {
    aiTask,
    aiGeneration,
    order,
    subscription,
    userAsset,
    userWrap,
    design,
    inviteCode,
    ticket,
  } = await import('../src/config/db/schema');
  await assert.rejects(
    async () => db().transaction(async () => {}),
    /atomic batch/
  );
  for (const id of [
    'invite-a',
    'invite-b',
    'ai-owner',
    'pay-owner',
    'wrap-owner',
  ]) {
    await db()
      .insert(user)
      .values({ id, name: id, email: `${id}@example.invalid` });
  }
  const tickets = await import('../src/modules/tickets/service');
  const createdTicket = await tickets.createTicket({
    userId: 'test-owner',
    title: 'D1 ticket',
    content: 'Question',
  });
  assert.ok(createdTicket.createdAt instanceof Date);
  await tickets.addMessage({
    ticketId: createdTicket.id,
    userId: 'test-owner',
    role: 'admin',
    content: 'Reply',
  });
  assert.equal(
    (await tickets.getTicketById(createdTicket.id))?.status,
    'replied'
  );
  assert.equal((await tickets.getTicketMessages(createdTicket.id)).length, 2);
  await proxy.env.DB.prepare(
    "CREATE TRIGGER reject_message BEFORE INSERT ON ticket_message WHEN NEW.content = 'reject' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END"
  ).run();
  await assert.rejects(
    tickets.createTicket({
      userId: 'test-owner',
      title: 'Must roll back',
      content: 'reject',
    })
  );
  assert.equal((await db().select().from(ticket)).length, 1);

  const invites = await import('../src/modules/invite-codes/service');
  const invite = await invites.createInviteCode({
    code: 'D1-ONE-USE',
    maxUses: 1,
  });
  const redemptions = await Promise.all(
    ['invite-a', 'invite-b'].map((userId) =>
      invites.redeemInviteCode({ userId, code: invite.code })
    )
  );
  assert.equal(redemptions.filter((item) => item.ok).length, 1);
  assert.equal(
    (
      await db().select().from(inviteCode).where(eq(inviteCode.id, invite.id))
    )[0].usedCount,
    1
  );
  const winner = redemptions[0].ok ? 'invite-a' : 'invite-b';
  assert.equal(
    (await invites.redeemInviteCode({ userId: winner, code: invite.code })).ok,
    true
  );

  const assets = await import('../src/modules/user-wraps/assets');
  const uploads = await Promise.allSettled(
    [1, 2].map((i) =>
      assets.recordUserUpload({
        ownerId: 'test-owner',
        key: `upload/${i}.webp`,
        url: `https://fixture.invalid/${i}.webp`,
        byteSize: 7,
        hash: `${i}`,
        limit: 10,
      })
    )
  );
  assert.equal(uploads.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(await assets.userAssetUsage('test-owner'), 7);
  const [uploadedAsset] = await db().select().from(userAsset);
  await assets.deleteUserAsset('test-owner', uploadedAsset.id, {
    deleteFile: async () => {},
  } as any);
  assert.equal(await assets.userAssetUsage('test-owner'), 0);
  console.log(
    'PASS: tickets rollback, invite capacity/idempotency, concurrent storage quota.'
  );

  const tasks = await import('../src/modules/ai-tasks/service');
  await credits.grant({ userId: 'ai-owner', credits: 10 });
  const task = await tasks.createTask({
    userId: 'ai-owner',
    mediaType: 'image',
    provider: 'fixture',
    model: 'fixture',
    prompt: 'test',
    costCredits: 10,
  });
  assert.ok(task.creditId);
  const failedTasks = await Promise.all(
    [1, 2].map(() =>
      tasks.updateTask({ taskId: task.id, status: tasks.AITaskStatus.FAILED })
    )
  );
  assert.equal(failedTasks.filter((result) => result.refunded).length, 1);
  assert.equal(await credits.getBalance('ai-owner'), 10);
  await proxy.env.DB.prepare(
    "CREATE TRIGGER reject_ai_task BEFORE INSERT ON ai_task WHEN NEW.prompt = 'reject' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END"
  ).run();
  await assert.rejects(
    tasks.createTask({
      userId: 'ai-owner',
      mediaType: 'image',
      provider: 'fixture',
      model: 'fixture',
      prompt: 'reject',
      costCredits: 10,
    })
  );
  assert.equal(await credits.getBalance('ai-owner'), 10);

  const settings = await import('../src/modules/config/service');
  await settings.saveConfigs({ stripe_secret_key: 'sk_test_fixture' });
  const payments = await import('../src/modules/payment/service');
  const { PaymentManager } = await import('../src/core/payment');
  const { PaymentStatus } = await import('../src/core/payment/types');
  const originalEvent = PaymentManager.prototype.getPaymentEvent;
  const paymentSession = {
    paymentStatus: PaymentStatus.SUCCESS,
    paymentResult: { id: 'checkout-test' },
    paymentInfo: {
      paymentAmount: 499,
      paymentCurrency: 'usd',
      transactionId: 'initial-tx',
    },
    subscriptionId: 'provider-sub',
    subscriptionInfo: {
      amount: 499,
      currency: 'usd',
      interval: 'month',
      currentPeriodStart: new Date('2026-01-01'),
      currentPeriodEnd: new Date('2026-02-01'),
    },
  };
  await db().insert(order).values({
    id: 'payment-test',
    orderNo: 'payment-test',
    userId: 'pay-owner',
    status: 'created',
    amount: 499,
    currency: 'usd',
    paymentProvider: 'stripe',
    paymentSessionId: 'checkout-test',
    paymentType: 'subscription',
    checkoutInfo: '{}',
    creditsAmount: 100,
    creditsValidDays: 0,
  });
  PaymentManager.prototype.getPaymentEvent = async () =>
    ({ eventType: 'checkout.success', paymentSession }) as any;
  try {
    await Promise.all(
      [1, 2].map(() =>
        payments.handleWebhook({
          req: new Request('https://fixture.invalid/webhook'),
          provider: 'stripe',
        })
      )
    );
    assert.equal(await credits.getBalance('pay-owner'), 100);
    assert.equal((await db().select().from(subscription)).length, 1);
    assert.equal(
      (await db().select().from(order).where(eq(order.id, 'payment-test')))[0]
        .status,
      'paid'
    );
    const renewal = {
      ...paymentSession,
      paymentResult: {},
      paymentInfo: {
        ...paymentSession.paymentInfo,
        transactionId: 'renewal-tx',
      },
      subscriptionInfo: {
        ...paymentSession.subscriptionInfo,
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
      },
    };
    await Promise.all(
      [1, 2].map(() => payments.handleSubscriptionRenewal(renewal, 'stripe'))
    );
    assert.equal(await credits.getBalance('pay-owner'), 200);
    const noIdRenewal = {
      ...renewal,
      paymentInfo: { paymentAmount: 499, paymentCurrency: 'usd' },
      subscriptionInfo: {
        ...renewal.subscriptionInfo,
        currentPeriodStart: new Date('2026-03-01'),
        currentPeriodEnd: new Date('2026-04-01'),
      },
    };
    await Promise.all(
      [1, 2].map(() =>
        payments.handleSubscriptionRenewal(noIdRenewal, 'stripe')
      )
    );
    await payments.handleSubscriptionRenewal(noIdRenewal, 'stripe');
    assert.equal(await credits.getBalance('pay-owner'), 300);
  } finally {
    PaymentManager.prototype.getPaymentEvent = originalEvent;
  }
  console.log(
    'PASS: AI task rollback/refund, concurrent checkout and renewal grant exactly once.'
  );

  const generations = await import('../src/modules/ai-tasks/wrap-generations');
  const gallery = await import('../src/modules/design-gallery/service');
  const wraps = await import('../src/modules/user-wraps/service');
  const { AITaskStatus } = await import('../src/core/ai/types');
  let providerCalls = 0;
  const provider = {
    name: 'fixture',
    generate: async () => {
      providerCalls++;
      return {
        taskId: `fixture-${providerCalls}`,
        taskStatus: AITaskStatus.PROCESSING,
      };
    },
  } as any;
  await credits.grant({ userId: 'wrap-owner', credits: 30 });
  const sharp = (await import('sharp')).default;
  const png = await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: '#2468aa' },
  })
    .png()
    .toBuffer();
  const template = readFileSync(
    'public/imgs/templates/tesla/model-3-2024-base.png'
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === 'https://fixture.invalid/output.png') return new Response(png);
    if (url === 'https://fixture.invalid/templates/tesla/model-3-2024-base.png')
      return new Response(template);
    throw new Error(`Unexpected network request in fixture: ${url}`);
  };
  const storage = {
    getPublicUrl: () => undefined,
    uploadFile: async ({ key }: { key: string }) => ({
      success: true,
      key,
      url: `https://fixture.invalid/${key}`,
    }),
  } as any;
  const generationParams = {
    userId: 'wrap-owner',
    vehicleSlug: 'model-3-2024-base' as const,
    mode: 'text-to-image' as const,
    prompt: 'Blue racing stripes',
    guideImageUrl:
      'https://fixture.invalid/templates/tesla/model-3-2024-base.png',
    storage,
    idempotencyKey: 'generation-success',
    provider,
    providerModel: 'fixture',
  };
  const duplicateStarts = await Promise.all(
    [1, 2].map(() => generations.createWrapGeneration(generationParams))
  );
  assert.equal(duplicateStarts[0].id, duplicateStarts[1].id);
  assert.equal(providerCalls, 1);
  assert.equal(await credits.getBalance('wrap-owner'), 20);
  assert.equal(await credits.getFrozenBalance('wrap-owner'), 10);
  const failing = await generations.createWrapGeneration({
    ...generationParams,
    idempotencyKey: 'generation-failed',
  });
  await Promise.all(
    [1, 2].map(() =>
      generations.completeWrapGeneration({
        generationId: failing.id,
        result: {
          taskId: 'fixture',
          taskStatus: AITaskStatus.FAILED,
          taskInfo: { errorMessage: 'fixture failure' },
        },
      })
    )
  );
  assert.equal(await credits.getBalance('wrap-owner'), 20);
  assert.equal(await credits.getFrozenBalance('wrap-owner'), 10);
  try {
    // Failure in the final insert must preserve the reservation and processing status.
    await proxy.env.DB.prepare(
      "CREATE TRIGGER reject_generated_wrap BEFORE INSERT ON user_wrap WHEN NEW.generation_id IS NOT NULL BEGIN SELECT RAISE(ABORT, 'fixture failure'); END"
    ).run();
    const completion = {
      generationId: duplicateStarts[0].id,
      storage,
      result: {
        taskId: 'fixture',
        taskStatus: AITaskStatus.SUCCESS,
        taskInfo: {
          images: [{ imageUrl: 'https://fixture.invalid/output.png' }],
        },
      },
    };
    await assert.rejects(generations.completeWrapGeneration(completion));
    assert.equal(await credits.getFrozenBalance('wrap-owner'), 10);
    assert.equal(
      (
        await db()
          .select()
          .from(aiGeneration)
          .where(eq(aiGeneration.id, completion.generationId))
      )[0].status,
      'processing'
    );
    await proxy.env.DB.prepare('DROP TRIGGER reject_generated_wrap').run();
    const complete = await generations.completeWrapGeneration(completion);
    assert.equal(complete.status, 'succeeded');
    assert.ok(complete.wrapId);
    assert.equal(await credits.getFrozenBalance('wrap-owner'), 0);
    await generations.completeWrapGeneration(completion);
    assert.equal(
      (
        await db()
          .select()
          .from(userWrap)
          .where(eq(userWrap.generationId, complete.id))
      ).length,
      1
    );
    const webp = await sharp(png).resize(800, 800).webp().toBuffer();
    await generations.saveGenerationCover(
      'wrap-owner',
      complete.id,
      new Uint8Array(webp),
      storage
    );
    assert.ok(
      (await generations.getOwnedSucceededGeneration('wrap-owner', complete.id))
        .coverKey
    );
    const [wrap] = await db()
      .select()
      .from(userWrap)
      .where(eq(userWrap.id, complete.wrapId));
    const publication = await gallery.approveUserWrap({
      wrapId: wrap.id,
      version: wrap.version,
      title: 'Approved D1',
      textureKey: wrap.textureKey,
      textureUrl: wrap.textureUrl,
      coverKey: 'cover/test.webp',
      coverUrl: 'https://fixture.invalid/cover/test.webp',
    });
    assert.equal(publication.saved.moderationStatus, 'approved');
    await Promise.all(
      [1, 2].map(() =>
        gallery.remixDesign({
          userId: 'test-owner',
          designId: publication.saved.id,
          idempotencyKey: 'same-remix',
        })
      )
    );
    assert.equal(
      (
        await db()
          .select()
          .from(design)
          .where(eq(design.id, publication.saved.id))
      )[0].remixCount,
      1
    );
    await gallery.updateWrapModeration({
      wrapId: wrap.id,
      version: wrap.version,
      status: 'hidden',
      title: 'Hidden D1',
    });
    await gallery.moderateDesign({
      designId: publication.saved.id,
      status: 'approved',
      title: 'Renamed D1',
    });
    assert.equal(
      (await db().select().from(userWrap).where(eq(userWrap.id, wrap.id)))[0]
        .name,
      'Renamed D1'
    );
    const deleted = await wraps.deleteWrap('wrap-owner', wrap.id);
    assert.equal(deleted.publications.length, 1);
    assert.ok(
      (
        await db()
          .select()
          .from(design)
          .where(eq(design.id, publication.saved.id))
      )[0].deletedAt
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log(
    'PASS: generation idempotency, reservation/refund, failed completion rollback, settlement, cover, gallery moderation/remix/delete.'
  );
} finally {
  await proxy.dispose();
  rmSync(persistPath, { recursive: true, force: true });
  delete (globalThis as any).__CF_ENV__;
}
