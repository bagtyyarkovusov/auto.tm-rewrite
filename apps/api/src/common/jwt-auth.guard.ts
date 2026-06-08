import type {
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import {
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";

import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authHeader = request.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify(token);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Fastify req augmentation
        (request as any).user = payload;
      } catch {
        // Ignore invalid tokens on public routes; protected routes will re-verify below
      }
    }

    if (isPublic) return true;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or malformed Authorization header");
    }

    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify(token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Fastify req augmentation
      (request as any).user = payload;
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[JwtAuthGuard] token verification failed:", (err as Error).message);
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
