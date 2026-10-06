export interface DemoInventoryResult {
  exitCode: 0 | 1;
  message: string;
  counts: Record<string, number>;
}
