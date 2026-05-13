import { Controller, Get } from "@nestjs/common";
import { Public } from "../../../common/public.decorator";

@Controller("api/v1/listings")
export class ListingsController {
  @Public()
  @Get("ping")
  ping(): { context: "listings"; status: "ok" } {
    return { context: "listings", status: "ok" };
  }
}
