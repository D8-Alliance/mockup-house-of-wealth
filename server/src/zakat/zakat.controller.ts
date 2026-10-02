import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { CalculateZakatDto } from './zakat.dto';
import { ZakatService } from './zakat.service';

@Controller('zakat')
export class ZakatController {
  constructor(private readonly zakatService: ZakatService) {}

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
