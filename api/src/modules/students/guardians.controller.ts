import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { GuardiansService } from './guardians.service';

@ApiTags('guardians')
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Roles('ADMIN')
  @Get()
  @ApiOperation({ summary: 'List all guardians' })
  listGuardians() {
    return this.guardiansService.listGuardians();
  }

  @Roles('ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get one guardian' })
  getGuardian(@Param('id') id: string) {
    return this.guardiansService.getGuardian(id);
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({
    summary:
      'Create a guardian with a login account (returns a temporary password if none was supplied)',
  })
  createGuardian(@Body() dto: CreateGuardianDto) {
    return this.guardiansService.createGuardian(dto);
  }

  @Roles('ADMIN')
  @Post(':id/reset-password')
  @ApiOperation({
    summary:
      "Issue a new temporary password for a guardian's login (e.g. resend/invite)",
  })
  resetPassword(@Param('id') id: string) {
    return this.guardiansService.resetPassword(id);
  }
}
