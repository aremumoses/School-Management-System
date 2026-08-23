import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { ALL_STAFF_ROLES } from './communication-roles.constants';
import {
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
} from './dto/message-template.dto';
import { MessageTemplatesService } from './message-templates.service';

@ApiTags('Communication — Message Templates')
@Controller('message-templates')
export class MessageTemplatesController {
  constructor(private readonly templatesService: MessageTemplatesService) {}

  @Roles(...ALL_STAFF_ROLES)
  @Get()
  list() {
    return this.templatesService.list();
  }

  @Roles(...ALL_STAFF_ROLES)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.templatesService.getOrThrow(id);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Post()
  create(
    @Body() dto: CreateMessageTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.templatesService.create(dto, user);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMessageTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.templatesService.update(id, dto, user);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.templatesService.remove(id, user);
  }
}
