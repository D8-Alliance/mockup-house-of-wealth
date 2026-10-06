import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { AddNisabRateDto, CalculateZakatDto, ZakatPreferenceDto } from './zakat.dto';
import { ZakatService } from './zakat.service';

@Controller('zakat')
export class ZakatController {
  constructor(private readonly zakatService: ZakatService) {}

  @Get('preference')
  preference(@CurrentUser() actor: AuthenticatedUser) {
    return this.zakatService.getPreference(actor);
  }

  @Put('preference')
  setPreference(@CurrentUser() actor: AuthenticatedUser, @Body() input: ZakatPreferenceDto) {
    return this.zakatService.setPreference(actor, input.enabled);
  }

  @Get('authorities')
  authorities(@CurrentUser() actor: AuthenticatedUser) {
    return this.zakatService.authorities(actor);
  }

  /** Records an authority's published nisab (role check in the service). */
  @Post('authorities/:code/nisab')
  addNisab(@CurrentUser() actor: AuthenticatedUser, @Param('code') code: string, @Body() input: AddNisabRateDto) {
    return this.zakatService.addNisabRate(actor, code, input);
  }

  @Post('calculations')
  calculate(@CurrentUser() actor: AuthenticatedUser, @Body() input: CalculateZakatDto) {
    return this.zakatService.calculate(actor, input);
  }

  @Get('calculations/latest')
  latest(@CurrentUser() actor: AuthenticatedUser) {
    return this.zakatService.latest(actor);
  }

  @Post('calculations/:id/payment')
  createPayment(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.zakatService.createPaymentBill(actor, id);
  }
}
