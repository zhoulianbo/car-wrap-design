import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { atomicOperation, isD1, withD1Retry } from '@/core/db/atomic';
import { aiTask } from '@/config/db/schema';
import {
  consume,
  prepareD1Consumption,
  prepareD1Revocation,
  revoke,
} from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * Create an AI task with optional credit consumption.
 */
export async function createTask(params: {
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  costCredits?: number;
  options?: any;
  scene?: string;
}): Promise<any> {
  const {
    userId,
    mediaType,
    provider,
    model,
    prompt,
    costCredits,
    options,
    scene = 'ai_task',
  } = params;

  if (isD1()) {
    return withD1Retry(async (plan) => {
      const id = getUuid();
      const charged =
        costCredits && costCredits > 0
          ? await prepareD1Consumption(
              {
                userId,
                credits: costCredits,
                scene,
                description: `AI ${mediaType} generation`,
                metadata: JSON.stringify({ taskId: id }),
              },
              plan
            )
          : null;
      if (charged && !charged.success) throw new Error('Insufficient credits');
      const results = await plan.commit([
        ...(charged?.queries || []),
        db()
          .insert(aiTask)
          .values({
            id,
            userId,
            mediaType,
            provider,
            model,
            prompt,
            status: AITaskStatus.PENDING,
            costCredits: costCredits || 0,
            options: options ? JSON.stringify(options) : null,
            scene,
            creditId: charged?.consumedCredit?.id,
            taskInfo: charged?.consumedCredit
              ? JSON.stringify({ creditId: charged.consumedCredit.id })
              : null,
          })
          .returning(),
      ]);
      return results.at(-1)[0];
    });
  }

  return db().transaction(async (tx: any) => {
    // 1. Insert task
    const taskData: any = {
      id: getUuid(),
      userId,
      mediaType,
      provider,
      model,
      prompt,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
      options: options ? JSON.stringify(options) : null,
      scene,
    };

    const [task] = await tx.insert(aiTask).values(taskData).returning();

    // 2. Consume credits if cost > 0
    if (costCredits && costCredits > 0) {
      const result = await consume({
        userId,
        credits: costCredits,
        scene,
        description: `AI ${mediaType} generation`,
        metadata: JSON.stringify({ taskId: task.id }),
        tx,
      });

      if (!result.success) {
        throw new Error('Insufficient credits');
      }

      // Store consumed credit ID for potential revocation
      if (result.consumedCredit) {
        await tx
          .update(aiTask)
          .set({
            taskInfo: JSON.stringify({ creditId: result.consumedCredit.id }),
            creditId: result.consumedCredit.id,
          })
          .where(eq(aiTask.id, task.id));
      }
    }

    return task;
  });
}

/**
 * Update task status. Revokes credits on failure.
 */
export async function updateTask(params: {
  taskId: string;
  status: AITaskStatus;
  taskResult?: any;
}) {
  const { taskId, status, taskResult } = params;

  if (isD1())
    return atomicOperation(async (tx, read, commit) => {
      const [task] = await read(
        tx.select().from(aiTask).where(eq(aiTask.id, taskId)).limit(1)
      );
      if (!task) throw new Error('Task not found');
      let creditId = task.creditId;
      if (!creditId && status === AITaskStatus.FAILED && task.taskInfo) {
        try {
          creditId = JSON.parse(task.taskInfo).creditId;
        } catch {
          /* Legacy invalid metadata has no recoverable debit ID. */
        }
      }
      const refunds =
        status === AITaskStatus.FAILED && creditId
          ? await prepareD1Revocation(creditId, { read })
          : [];
      await commit([
        ...refunds,
        tx
          .update(aiTask)
          .set({
            status,
            ...(taskResult ? { taskResult: JSON.stringify(taskResult) } : {}),
          })
          .where(eq(aiTask.id, taskId)),
      ]);
      return { refunded: refunds.length > 0 };
    });

  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) throw new Error('Task not found');

  // Update task
  const updateData: any = { status };
  if (taskResult) {
    updateData.taskResult = JSON.stringify(taskResult);
  }

  await db().update(aiTask).set(updateData).where(eq(aiTask.id, taskId));

  // Revoke credits on failure
  let refunded = false;
  if (status === AITaskStatus.FAILED) {
    try {
      const info = task.taskInfo
        ? JSON.parse(task.taskInfo as string)
        : undefined;
      const creditId = task.creditId || info?.creditId;
      if (creditId) {
        refunded = Boolean(await revoke(creditId));
      }
    } catch {
      // Ignore parse errors
    }
  }
  return { refunded };
}

/**
 * Get tasks for a user.
 */
export async function getTasks(params: {
  userId: string;
  mediaType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, mediaType, status, page = 1, limit = 20 } = params;

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/**
 * Find task by ID.
 */
export async function findTask(taskId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);
  return result;
}
