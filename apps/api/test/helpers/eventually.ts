// Polls `probe` until it returns a non-null value or `timeoutMs` expires.
// e2e specs use this to wait for asynchronous side effects (for example an
// @OnEvent handler's write) that are not part of the HTTP response, instead
// of reading once and flaking under event-loop load.
export async function eventually<T>(
  probe: () => Promise<T | null>,
  {
    timeoutMs = 10_000,
    intervalMs = 100,
    description = "the expected value",
  }: { timeoutMs?: number; intervalMs?: number; description?: string } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value !== null) {
      return value;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for ${description}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
