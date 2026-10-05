/**
 * The two values every User is assigned at creation and keeps for the life of
 * the account (#353 identity design, items a and c). Neither is unique.
 *
 * - `nameNumber` makes the Generated Name ("Driver 4821") with a prefix in
 *   the reader's language.
 * - `avatarIndex` picks one of the car avatars bundled in the app.
 *
 * The migration `add_user_name_number_and_avatar_index` gives the columns the
 * same ranges as a database default and check constraints; keep them equal.
 */
export const NAME_NUMBER_RANGE = { min: 1000, max: 9999 } as const;
export const AVATAR_INDEX_RANGE = { min: 0, max: 11 } as const;

export interface GeneratedIdentity {
  readonly nameNumber: number;
  readonly avatarIndex: number;
}

/** A source of uniform numbers in [0, 1), such as `Math.random`. */
export type RandomSource = () => number;

function drawInRange(random: RandomSource, range: { min: number; max: number }): number {
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

export function drawGeneratedIdentity(random: RandomSource): GeneratedIdentity {
  return {
    nameNumber: drawInRange(random, NAME_NUMBER_RANGE),
    avatarIndex: drawInRange(random, AVATAR_INDEX_RANGE),
  };
}
