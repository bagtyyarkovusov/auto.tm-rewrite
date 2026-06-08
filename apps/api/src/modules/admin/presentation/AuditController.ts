import {
  Controller,
  Get,
  Inject,
  UseGuards,
  Query,
} from "@nestjs/common";

import { AdminGuard } from "../../../common/admin.guard";
import { ListAuditEntries } from "../application/ListAuditEntries";

@Controller("api/v1/admin/audit")
@UseGuards(AdminGuard)
export class AuditController {
  constructor(
    @Inject(ListAuditEntries)
    private readonly listAuditEntriesUC: ListAuditEntries,
  ) {}

  @Get()
  async listAuditEntries(
    @Query("action") action: string | undefined,
    @Query("targetType") targetType: string | undefined,
    @Query("targetId") targetId: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
  ) {
    const result = await this.listAuditEntriesUC.execute({
      action,
      targetType,
      targetId,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    });

    return {
      items: result.items.map((item) =>
        ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }
}
