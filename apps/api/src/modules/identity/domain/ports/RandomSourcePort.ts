/** Uniform numbers in [0, 1) for values that need no secrecy, such as the Generated Name number. */
export interface RandomSourcePort {
  next(): number;
}

export const RANDOM_SOURCE_PORT = Symbol("RandomSourcePort");
