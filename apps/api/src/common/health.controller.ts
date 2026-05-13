import { Controller, Get } from "@nestjs/common";

import { Public } from "./public.decorator";

@Controller()
export class HealthController {
  @Public()
  @Get("healthz")
  healthz() {
    return { status: "ok" };
  }

  @Public()
  @Get("readyz")
  readyz() {
    return { status: "ok" };
  }
}
