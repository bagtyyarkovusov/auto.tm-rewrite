import { ForbiddenException } from "@nestjs/common";
import { AuthSchemas } from "@auto-tm/contracts";

/**
 * The 403 for a marketplace change attempted while the User's deletion is
 * scheduled (ADR-0032). HTTP and realtime entry points throw this one answer,
 * so the code and message match on both transports. Only HTTP carries
 * `details.reason`: the realtime gateway acknowledges with the code and message
 * alone (`ConversationGateway.toSocketError`).
 */
export function accountDeletionPendingException(): ForbiddenException {
  return new ForbiddenException({
    code: "FORBIDDEN",
    message:
      "Your account is scheduled for deletion. Restore it to make changes.",
    details: { reason: AuthSchemas.ACCOUNT_DELETION_PENDING_REASON },
  });
}
