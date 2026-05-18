import { Controller, Get, Inject } from "@nestjs/common";

import { Public } from "../../../common/public.decorator";
import { GetExchangeRates } from "../application/GetExchangeRates";

@Controller("api/v1/exchange-rates")
export class ExchangeRatesController {
  constructor(
    @Inject(GetExchangeRates)
    private readonly getExchangeRatesUC: GetExchangeRates,
  ) {}

  @Public()
  @Get()
  async list() {
    return this.getExchangeRatesUC.execute();
  }
}
