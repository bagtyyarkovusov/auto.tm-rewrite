export const NAME_NUMBER_RANGE = { min: 0, max: 0 } as const;
export const AVATAR_INDEX_RANGE = { min: 0, max: 0 } as const;

export interface GeneratedIdentity {
  readonly nameNumber: number;
  readonly avatarIndex: number;
}

export function drawGeneratedIdentity(_random: () => number): GeneratedIdentity {
  throw new Error("Not implemented");
}
