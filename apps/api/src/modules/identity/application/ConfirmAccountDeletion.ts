import { Inject, Injectable } from "@nestjs/common";

import { signInCodeDestination } from "../domain/SignInCodeDestination";
import { SIGN_IN_CODE_CHANNELS } from "../domain/types";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { SignInMethodRepository } from "../domain/ports/SignInMethodRepository";
import { PrismaOtpRequestRepository } from "../infrastructure/PrismaOtpRequestRepository";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";
import { DeleteMe } from "./DeleteMe";
import { VerifySignInCode } from "./VerifySignInCode";

export type ConfirmAccountDeletionInput = (
  | { phone: string }
  | { email: string }
) & {
  code: string;
};

/**
 * Confirms a public web deletion code (ADR-0054). For a held value it starts
 * the same grace period as `DELETE /me`; for an unheld value it only consumes
 * the code. Both outcomes return nothing, so callers cannot tell them apart.
 */
@Injectable()
export class ConfirmAccountDeletion {
  constructor(
    @Inject(PrismaOtpRequestRepository)
    private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(PrismaUserRepository)
    private readonly userRepo: SignInMethodRepository,
    @Inject(VerifySignInCode)
    private readonly verifySignInCode: VerifySignInCode,
    @Inject(DeleteMe)
    private readonly deleteMe: DeleteMe,
  ) {}

  async execute(input: ConfirmAccountDeletionInput): Promise<void> {
    const destination = signInCodeDestination(input);
    const holder = destination.channel === SIGN_IN_CODE_CHANNELS.PHONE
      ? await this.userRepo.findByPhone(destination.value)
      : await this.userRepo.findByEmail(destination.value);

    // A held value only accepts a code bound to its holder, which excludes
    // unbound sign-in requests such as a reviewer's fixed email code.
    const request = await this.verifySignInCode.execute(
      destination,
      input.code,
      holder?.id,
    );

    if (holder === null) {
      await this.otpRequestRepo.markVerified(request.id);
      return;
    }

    // A second confirmation during grace keeps the original purge date.
    if (holder.deletionScheduledAt === null) {
      await this.deleteMe.execute({ userId: holder.id });
    }
    await this.otpRequestRepo.markVerified(request.id, holder.id);
  }
}
