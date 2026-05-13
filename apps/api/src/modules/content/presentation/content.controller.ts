import { Controller, Get } from "@nestjs/common";

import { Public } from "../../../common/public.decorator";

@Controller("api/v1/content")
export class ContentController {
  @Public()
  @Get("ping")
  ping(): { context: "content"; status: "ok" } {
    return { context: "content", status: "ok" };
  }
}
