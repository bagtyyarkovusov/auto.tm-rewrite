import type { CanActivate, ExecutionContext } from "@nestjs/common";
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import type { IdentityCheckPort } from "../modules/identity/domain/ports/IdentityCheckPort";
import type { SessionRepository } from "../modules/identity/domain/ports/SessionRepository";
import type { ClockPort } from "../modules/identity/domain/ports/ClockPort";
import { IDENTITY_TOKENS } from "../modules/identity/identity.tokens";

interface JwtPayload {
  sub?: string;
  sid?: string;
  role?: string;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
    @Inject(IDENTITY_TOKENS.SessionRepository)
    private readonly sessionRepo: SessionRepository,
    @Inject(IDENTITY_TOKENS.ClockPort)
    private readonly clock: ClockPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: JwtPayload }>();
    const user = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException("Authentication required");
    }

    const isAdmin = await this.identityCheck.isAdmin(user.sub);
    if (!isAdmin) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Admin role required",
      });
    }

    if (!user.sid) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Admin TOTP elevation required",
      });
    }

    const session = await this.sessionRepo.findById(user.sid);
    if (!session || session.userId !== user.sub) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Admin TOTP elevation required",
      });
    }

    const now = this.clock.now();
    if (session.expiresAt <= now) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Admin session expired",
      });
    }

    if (!session.adminTotpExpiresAt || session.adminTotpExpiresAt <= now) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Admin TOTP elevation expired",
      });
    }

    return true;
  }
}
