/** A suspended User tried to change their own marketplace-visible data. */
export class UserSuspendedError extends Error {
  constructor() {
    super("User is suspended");
    this.name = "UserSuspendedError";
  }
}
