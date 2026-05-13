import { Controller, Get } from "@nestjs/common";

import { Public } from "../../../common/public.decorator";

@Controller("api/v1/identity")
export class IdentityController {
  @Public()
  @Get("ping")
  ping(): { context: "identity"; status: "ok" } {
    return { context: "identity", status: "ok" };
  }
}
