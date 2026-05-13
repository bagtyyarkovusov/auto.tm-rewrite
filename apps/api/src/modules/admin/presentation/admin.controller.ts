import { Controller, Get } from "@nestjs/common";
import { Public } from "../../../common/public.decorator";

@Controller("api/v1/admin")
export class AdminController {
  @Public()
  @Get("ping")
  ping(): { context: "admin"; status: "ok" } {
    return { context: "admin", status: "ok" };
  }
}
