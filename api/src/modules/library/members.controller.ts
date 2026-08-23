import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { MembersService } from './members.service';

const MANAGE_ROLES = ['LIBRARIAN', 'ADMIN'] as const;

@ApiTags('library')
@Controller('library/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Roles(...MANAGE_ROLES)
  @Get('search')
  @ApiQuery({ name: 'query', required: true })
  @ApiOperation({
    summary: 'Search students and staff by name/admission number/email',
  })
  search(@Query('query') query: string) {
    return this.membersService.search(query ?? '');
  }

  @Roles(...MANAGE_ROLES)
  @Get(':borrowerType/:borrowerId')
  @ApiOperation({
    summary: "A member's current loans, borrowing limit, and loan history",
  })
  getDetail(
    @Param('borrowerType') borrowerType: 'STUDENT' | 'STAFF',
    @Param('borrowerId') borrowerId: string,
  ) {
    return this.membersService.getDetail(borrowerType, borrowerId);
  }
}
