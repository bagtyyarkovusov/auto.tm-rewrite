export interface DemoInventoryResult {
  exitCode: 0 | 1;
  /** Safe to print: counts and reasons only, never a phone, email or connection value. */
  message: string;
  counts: Record<string, number>;
}

/**
 * A failure whose message the entry point may print: it names a Commons file, a car or a count,
 * never a connection value. Any other error is reported by its class alone.
 */
export class DemoInventoryError extends Error {
  override readonly name = "DemoInventoryError";
}

export function refused(mode: "seed" | "remove", reason: string): DemoInventoryResult {
  return { exitCode: 1, message: `Demo inventory ${mode} refused: ${reason}`, counts: {} };
}
