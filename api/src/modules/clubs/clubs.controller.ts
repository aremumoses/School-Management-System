import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { ClubsService } from './clubs.service';
import { AddClubMemberDto, CreateClubDto, UpdateClubDto } from './dto/club.dto';

@ApiTags('clubs')
@Controller()
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post('clubs')
  @ApiOperation({ summary: 'Create a club' })
  create(@Body() dto: CreateClubDto) {
    return this.clubsService.create(dto);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Get('clubs')
  @ApiOperation({ summary: 'All clubs with patron and member count' })
  list() {
    return this.clubsService.list();
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Get('clubs/:id')
  @ApiOperation({ summary: 'One club with its full member roster' })
  getOne(@Param('id') id: string) {
    return this.clubsService.getOrThrow(id);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Patch('clubs/:id')
  @ApiOperation({ summary: 'Update a club' })
  update(@Param('id') id: string, @Body() dto: UpdateClubDto) {
    return this.clubsService.update(id, dto);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post('clubs/:id/members')
  @ApiOperation({ summary: 'Enroll a student into a club' })
  addMember(@Param('id') id: string, @Body() dto: AddClubMemberDto) {
    return this.clubsService.addMember(id, dto);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Delete('clubs/:id/members/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a student from a club' })
  async removeMember(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ): Promise<void> {
    await this.clubsService.removeMember(id, studentId);
  }

  // Under /students/:id so the path reads naturally for the student/guardian
  // callers it serves ("my clubs"); staff with ADMIN/VP use GET /clubs/:id.
  @Roles('ADMIN', 'VICE_PRINCIPAL', 'STUDENT', 'PARENT')
  @Get('students/:id/clubs')
  @ApiOperation({
    summary: "A student's club memberships (self / own ward only)",
  })
  listForStudent(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.clubsService.listForStudent(id, user);
  }
}
