/** A suspended User tried to authenticate or change their marketplace-visible data. */
export class UserSuspendedError extends Error {
  constructor() {
    super("User is suspended");
    this.name = "UserSuspendedError";
  }
}
