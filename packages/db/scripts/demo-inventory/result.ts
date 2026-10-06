export interface DemoInventoryResult {
  exitCode: 0 | 1;
  /** Safe to print: counts and reasons only, never a phone, email or connection value. */
  message: string;
  counts: Record<string, number>;
}

export function refused(mode: "seed" | "remove", reason: string): DemoInventoryResult {
  return { exitCode: 1, message: `Demo inventory ${mode} refused: ${reason}`, counts: {} };
}
