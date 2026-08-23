import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { ALL_STAFF_ROLES } from './communication-roles.constants';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  CreateMessageDto,
} from './dto/conversation.dto';

// docs §6 teacher<->parent threads, plus (Stage 15, docs/06 Messages line)
// direct student<->teacher threads — a STUDENT may only open one with
// their own subject/class teachers (enforced in ConversationsService).
const PARTICIPANT_ROLES = [
  ...ALL_STAFF_ROLES,
  'PARENT' as const,
  'STUDENT' as const,
];

@ApiTags('Communication — Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Roles(...PARTICIPANT_ROLES)
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.conversationsService.list(user);
  }

  // Declared before ':id' so the literal path isn't swallowed by the param
  // route. Student-only: the teacher picker for starting a new thread.
  @Roles('STUDENT')
  @Get('teachers')
  listMyTeachers(@CurrentUser() user: RequestUser) {
    return this.conversationsService.listMyTeachers(user);
  }

  // Staff-initiated (guardian threads) or student-initiated (own-teacher
  // threads) — but never guardian-initiated, per docs §6.
  @Roles(...ALL_STAFF_ROLES, 'STUDENT')
  @Post()
  create(@Body() dto: CreateConversationDto, @CurrentUser() user: RequestUser) {
    return this.conversationsService.create(dto, user);
  }

  @Roles(...PARTICIPANT_ROLES)
  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.conversationsService.getOrThrow(id, user);
  }

  @Roles(...PARTICIPANT_ROLES)
  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.conversationsService.addMessage(id, dto, user);
  }
}
