import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/roles.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return {
      status: 'ok',
      service: 'house-of-wealth-api',
      time: new Date().toISOString(),
    };
  }
}
