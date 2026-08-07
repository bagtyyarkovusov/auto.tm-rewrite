export interface ConstantTimeComparatorPort {
  compare(candidate: string, expected: string): boolean;
}

export const CONSTANT_TIME_COMPARATOR_PORT = Symbol("ConstantTimeComparatorPort");
