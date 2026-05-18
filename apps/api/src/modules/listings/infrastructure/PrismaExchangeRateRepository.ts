import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { ExchangeRatePort, ExchangeRate } from "../domain/ports/ExchangeRatePort";
import type { Currency } from "../domain/types";

@Injectable()
export class PrismaExchangeRateRepository implements ExchangeRatePort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) {
      return 1;
    }

    const row = await this.prisma.exchangeRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    });

    if (!row) {
      return 0;
    }

    return row.rate;
  }

  async listAll(): Promise<ExchangeRate[]> {
    const rows = await this.prisma.exchangeRate.findMany();
    return rows.map((r) => ({
      fromCurrency: r.fromCurrency as Currency,
      toCurrency: r.toCurrency as Currency,
      rate: r.rate,
      updatedAt: r.updatedAt,
    }));
  }
}
