import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { ExtendedError } from "socket.io/dist/namespace";
import type { Socket } from "socket.io";

export interface AuthenticatedSocketUser {
  sub: string;
  sid: string;
  phone: string;
  role: string;
}

declare module "socket.io" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SocketData {
    user?: AuthenticatedSocketUser;
  }
}

function middlewareError(
  message: string,
  data: Record<string, unknown>,
): ExtendedError {
  const err = new Error(message) as ExtendedError;
  err.data = data;
  return err;
}

@Injectable()
export class SocketAuthMiddleware {
  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  use(socket: Socket, next: (err?: ExtendedError) => void): void {
    const token = this.extractToken(socket);
    if (!token) {
      next(middlewareError("Missing authentication token", {
        code: "MISSING_AUTH_TOKEN",
      }));
      return;
    }

    try {
      const payload = this.jwtService.verify<AuthenticatedSocketUser>(token);
      if (!payload.sub) {
        next(middlewareError("Invalid authentication token payload", {
          code: "INVALID_TOKEN_PAYLOAD",
        }));
        return;
      }
      socket.data.user = payload;
      next();
    } catch {
      next(middlewareError("Invalid or expired authentication token", {
        code: "INVALID_TOKEN",
      }));
    }
  }

  private extractToken(socket: Socket): string | undefined {
    const auth = socket.handshake.auth as { token?: string } | undefined;
    if (auth?.token) {
      return auth.token;
    }

    const header = socket.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return header.slice(7);
    }

    return undefined;
  }
}
