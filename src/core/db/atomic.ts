import { envConfigs } from '@/config';

import { getD1Binding } from './d1';
import { db } from './index';

export const isD1 = () => envConfigs.database_provider === 'd1';

export class AtomicConflictError extends Error {
  constructor() {
    super('State changed; please retry');
  }
}

/** Reads are planned first; commit exactly one batch, retrying stale snapshots. */
export async function withD1Retry<T>(
  execute: (plan: D1AtomicPlan) => Promise<T>
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await execute(new D1AtomicPlan());
    } catch (error) {
      if (!(error instanceof AtomicConflictError) || attempt >= 2) throw error;
    }
  }
}

/** Read-before-write workflow shared by native transactions and guarded D1 batches. */
export async function atomicOperation<T>(
  execute: (
    database: ReturnType<typeof db>,
    read: (query: any) => Promise<any[]>,
    commit: (queries: any[]) => Promise<any[]>
  ) => Promise<T>
): Promise<T> {
  if (isD1())
    return withD1Retry((plan) =>
      execute(
        db(),
        (query) => plan.read(query),
        (queries) => plan.commit(queries)
      )
    );
  return db().transaction((tx: ReturnType<typeof db>) =>
    execute(
      tx,
      async (query) => await query,
      async (queries) => {
        const results = [];
        for (const query of queries) results.push(await query);
        return results;
      }
    )
  );
}

/** Fixed write batches use D1 batch or a native transaction. */
export async function atomicBatch(
  build: (database: ReturnType<typeof db>) => any[]
): Promise<any[]> {
  const database = db();
  if (!isD1()) {
    return database.transaction(async (tx: ReturnType<typeof db>) => {
      const results = [];
      for (const query of build(tx)) results.push(await query);
      return results;
    });
  }
  return database.batch(build(database));
}

/**
 * D1 has no interactive transactions. Read snapshots before constructing a
 * batch, then assert those exact SQL results are unchanged at commit time.
 * Guards run before any write; D1 rolls back all statements on any failure.
 * Drizzle's prepared mapper preserves dates, booleans and selected field names.
 */
export class D1AtomicPlan {
  private guards: any[] = [];
  async read(query: any): Promise<any[]> {
    const prepared = query._prepare();
    const compiled = prepared.getQuery();
    const [columns, ...rows] = await getD1Binding()
      .prepare(`select * from (${compiled.sql}) as _snapshot`)
      .bind(...compiled.params)
      .raw({ columnNames: true });
    const identifiers = columns
      .map((name: string) => `"${name.replaceAll('"', '""')}"`)
      .join(',');
    this.guards.push(
      getD1Binding()
        .prepare(
          `select case when (select json_group_array(json_array(${identifiers})) from (${compiled.sql}) as _snapshot) = ? then 1 else json('ATOMIC_CONFLICT') end`
        )
        .bind(...compiled.params, JSON.stringify(rows))
    );
    return prepared.mapAllResult(rows);
  }

  async commit(queries: any[]): Promise<any[]> {
    const prepared = queries.map((query) => query._prepare());
    const statements = prepared.map((query) => {
      const compiled = query.getQuery();
      return getD1Binding()
        .prepare(compiled.sql)
        .bind(...compiled.params);
    });
    try {
      const results = await getD1Binding().batch([
        ...this.guards,
        ...statements,
      ]);
      return prepared.map((query, index) =>
        query.mapResult(results[this.guards.length + index], true)
      );
    } catch (error) {
      if (this.guards.length && String(error).includes('malformed JSON'))
        throw new AtomicConflictError();
      throw error;
    }
  }
}
