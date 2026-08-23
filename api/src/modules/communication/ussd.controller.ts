import { Body, Controller, Header, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { SetUssdPinDto, UssdRequestDto } from './dto/ussd.dto';
import { UssdService } from './ussd.service';

@ApiTags('ussd')
@Controller()
export class UssdController {
  constructor(private readonly service: UssdService) {}

  /**
   * Public, unauthenticated (the USSD aggregator calls this directly, no
   * user session exists — phone+PIN in the request body is the
   * authentication). Plain-text `CON .../END ...` response, per the
   * protocol both Africa's Talking and most Nigerian aggregators expect.
   */
  @Public()
  @Post('ussd')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({
    summary: 'USSD menu step (aggregator-called, unauthenticated)',
  })
  handle(@Body() dto: UssdRequestDto): Promise<string> {
    return this.service.handle(dto);
  }

  /** Self-service — a logged-in guardian sets/changes their own USSD PIN from the parent portal. */
  @Roles()
  @Post('ussd/pin')
  setPin(@Body() dto: SetUssdPinDto, @CurrentUser() user: RequestUser) {
    return this.service.setPin(dto, user);
  }
}
