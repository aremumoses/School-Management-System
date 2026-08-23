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
import { MapSubjectToClassDto } from './dto/map-subject-class.dto';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@Controller()
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Roles()
  @Get('subjects')
  @ApiOperation({
    summary: 'List subjects, each with the classes it is mapped to',
  })
  listSubjects() {
    return this.subjectsService.listSubjects();
  }

  @Roles()
  @Get('subjects/:id')
  @ApiOperation({ summary: 'Get one subject with its class mappings' })
  getSubject(@Param('id') id: string) {
    return this.subjectsService.getSubject(id);
  }

  @Roles('ADMIN')
  @Post('subjects')
  @ApiOperation({ summary: 'Create a subject' })
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.createSubject(dto);
  }

  @Roles('ADMIN')
  @Patch('subjects/:id')
  @ApiOperation({ summary: 'Update a subject' })
  updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.updateSubject(id, dto);
  }

  @Roles('ADMIN')
  @Delete('subjects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subject' })
  async deleteSubject(@Param('id') id: string): Promise<void> {
    await this.subjectsService.deleteSubject(id);
  }

  @Roles('ADMIN')
  @Post('subjects/:id/classes')
  @ApiOperation({ summary: 'Map a subject to a class level' })
  mapToClass(
    @Param('id') subjectId: string,
    @Body() dto: MapSubjectToClassDto,
  ) {
    return this.subjectsService.mapToClass(subjectId, dto);
  }

  @Roles('ADMIN')
  @Delete('class-subjects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a subject-to-class mapping' })
  async unmapFromClass(@Param('id') id: string): Promise<void> {
    await this.subjectsService.unmapFromClass(id);
  }
}
