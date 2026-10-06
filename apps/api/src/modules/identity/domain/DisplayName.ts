import { IdentitySchemas } from "@auto-tm/contracts";

import { IDENTITY_ERROR_CODES, IdentityDomainError } from "./types";

/**
 * A name refused by the Display Name rule. The message never carries the
 * refused text, so logging the error does not log the name.
 */
export class InvalidDisplayNameError extends IdentityDomainError {
  constructor(readonly reason: IdentitySchemas.DisplayNameProblem) {
    super(IDENTITY_ERROR_CODES.INVALID_DISPLAY_NAME, `Display Name refused: ${reason}`);
    this.name = "InvalidDisplayNameError";
  }
}

/**
 * A name the User chose for themselves (#353 identity design, item b). Built
 * on the rule shared with the app in `@auto-tm/contracts`: stored normalized,
 * 2 to 30 code points, any script. Not unique and not moderated.
 */
export class DisplayName {
  private constructor(readonly value: string) {}

  static create(raw: string): DisplayName {
    const problem = IdentitySchemas.displayNameProblem(raw);
    if (problem !== undefined) {
      throw new InvalidDisplayNameError(problem);
    }
    return new DisplayName(IdentitySchemas.normalizeDisplayName(raw));
  }
}
