import type { CanActivate, ExecutionContext } from "@nestjs/common";
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import type { IdentityCheckPort } from "../modules/identity/domain/ports/IdentityCheckPort";
import { IDENTITY_TOKENS } from "../modules/identity/identity.tokens";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: { sub: string } }>();
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

    return true;
  }
}
