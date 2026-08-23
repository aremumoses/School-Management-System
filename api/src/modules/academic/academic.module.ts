import { Module } from '@nestjs/common';
import { ClassesController } from './classes/classes.controller';
import { ClassesService } from './classes/classes.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { SubjectsController } from './subjects/subjects.controller';
import { SubjectsService } from './subjects/subjects.service';

@Module({
  controllers: [SessionsController, ClassesController, SubjectsController],
  providers: [SessionsService, ClassesService, SubjectsService],
  exports: [SessionsService, ClassesService, SubjectsService],
})
export class AcademicModule {}
