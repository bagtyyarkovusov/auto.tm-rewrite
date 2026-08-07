/**
 * Bounded dependency-readiness runner for /readyz.
 *
 * Every check is raced against the same per-check timeout and all checks run
 * concurrently, so the endpoint is bounded by ~timeoutMs regardless of how
 * many dependencies are registered. Failures are captured per check and never
 * leak error messages (which may embed hosts or other connection details)
 * into the HTTP response.
 */
export type ReadinessCheck = () => Promise<void>;

export type ReadinessCheckStatus = "ok" | "failed";

export interface ReadinessResult {
  ready: boolean;
  checks: Record<string, ReadinessCheckStatus>;
}

export async function runReadinessChecks(
  checks: Record<string, ReadinessCheck>,
  timeoutMs: number,
): Promise<ReadinessResult> {
  const entries = Object.entries(checks);

  const statuses = await Promise.all(
    entries.map(async ([name, check]): Promise<[string, ReadinessCheckStatus]> => {
      let timer: NodeJS.Timeout | undefined;
      try {
        const timeout = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(`readiness check "${name}" timed out`)),
            timeoutMs,
          );
          // Do not keep the event loop alive for probe timers.
          timer.unref?.();
        });
        await Promise.race([check(), timeout]);
        return [name, "ok"];
      } catch {
        return [name, "failed"];
      } finally {
        if (timer) clearTimeout(timer);
      }
    }),
  );

  const checksRecord = Object.fromEntries(statuses);
  return {
    ready: statuses.every(([, status]) => status === "ok"),
    checks: checksRecord,
  };
}
