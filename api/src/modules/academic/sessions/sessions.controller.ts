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
import { Roles } from '../../../common/decorators/roles.decorator';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { SessionsService } from './sessions.service';

@ApiTags('academic-sessions')
@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Roles()
  @Get('academic-sessions')
  @ApiOperation({ summary: 'List academic sessions, each with its terms' })
  listSessions() {
    return this.sessionsService.listSessions();
  }

  @Roles()
  @Get('terms/current')
  @ApiOperation({ summary: 'Get the current term' })
  getCurrentTerm() {
    return this.sessionsService.getCurrentTerm();
  }

  @Roles()
  @Get('academic-sessions/:id')
  @ApiOperation({ summary: 'Get one academic session with its terms' })
  getSession(@Param('id') id: string) {
    return this.sessionsService.getSession(id);
  }

  @Roles('ADMIN')
  @Post('academic-sessions')
  @ApiOperation({
    summary: 'Create an academic session, optionally with its terms',
  })
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(dto);
  }

  @Roles('ADMIN')
  @Post('academic-sessions/:id/terms')
  @ApiOperation({ summary: 'Add a term to an existing session' })
  addTerm(@Param('id') sessionId: string, @Body() dto: CreateTermDto) {
    return this.sessionsService.addTerm(sessionId, dto);
  }

  @Roles('ADMIN')
  @Patch('terms/:id')
  @ApiOperation({ summary: 'Update a term' })
  updateTerm(@Param('id') id: string, @Body() dto: UpdateTermDto) {
    return this.sessionsService.updateTerm(id, dto);
  }

  @Roles('ADMIN')
  @Delete('terms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a term' })
  async deleteTerm(@Param('id') id: string): Promise<void> {
    await this.sessionsService.deleteTerm(id);
  }

  @Roles('ADMIN')
  @Post('terms/:id/set-current')
  @ApiOperation({
    summary: 'Mark this term as the current one (unsets any other)',
  })
  setCurrentTerm(@Param('id') id: string) {
    return this.sessionsService.setCurrentTerm(id);
  }
}
