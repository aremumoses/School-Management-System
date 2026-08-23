import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { ALL_STAFF_ROLES } from './communication-roles.constants';
import {
  CreateNoticeDto,
  QueryNoticesDto,
  UpdateNoticeDto,
} from './dto/notice.dto';
import { NoticesService } from './notices.service';

@ApiTags('Communication — Notices')
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  // docs §9 — the notice board is readable by everyone with a login
  // (Student/Parent/Staff dashboards all show a "Notices" tab); only
  // staff can post/edit/delete (matrix: Student/Parent are "V").
  @Roles()
  @Get()
  list(@Query() query: QueryNoticesDto) {
    return this.noticesService.list(query);
  }

  @Roles()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.noticesService.getOrThrow(id);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Post()
  create(@Body() dto: CreateNoticeDto, @CurrentUser() user: RequestUser) {
    return this.noticesService.create(dto, user);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoticeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.noticesService.update(id, dto, user);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.noticesService.remove(id, user);
  }
}
