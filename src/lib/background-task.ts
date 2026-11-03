type WaitUntil = (promise: Promise<unknown>) => void;

/** Register work that must outlive the HTTP response when running on Workers. */
export function scheduleBackgroundTask(
  task: Promise<unknown>,
  onError: (error: unknown) => void
) {
  const waitUntil = (globalThis as { __CF_WAIT_UNTIL__?: WaitUntil })
    .__CF_WAIT_UNTIL__;
  if (typeof waitUntil !== 'function') return false;
  waitUntil(task.catch(onError));
  return true;
}
