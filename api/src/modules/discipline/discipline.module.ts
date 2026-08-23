import { Module } from '@nestjs/common';
import { CommunicationModule } from '../communication/communication.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [CommunicationModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class DisciplineModule {}
