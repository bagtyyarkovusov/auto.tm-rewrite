import { Controller, Get } from "@nestjs/common";
import { Public } from "../../../common/public.decorator";

@Controller("api/v1/catalog")
export class CatalogController {
  @Public()
  @Get("ping")
  ping(): { context: "catalog"; status: "ok" } {
    return { context: "catalog", status: "ok" };
  }
}
