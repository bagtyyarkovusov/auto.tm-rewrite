import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

// Red-checkpoint stub: keeps ThrottlerGuard's default tracker (`req.ip`).
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {}
