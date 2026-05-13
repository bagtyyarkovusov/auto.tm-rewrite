import { Controller, Get } from "@nestjs/common";
import { Public } from "../../../common/public.decorator";

@Controller("api/v1/reports")
export class ReportsController {
  @Public()
  @Get("ping")
  ping(): { context: "reports"; status: "ok" } {
    return { context: "reports", status: "ok" };
  }
}
