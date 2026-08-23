import { Module } from '@nestjs/common';
import { CommunicationModule } from '../communication/communication.module';
import { ConsentFormsController } from './consent-forms.controller';
import { ConsentFormsService } from './consent-forms.service';

@Module({
  imports: [CommunicationModule],
  controllers: [ConsentFormsController],
  providers: [ConsentFormsService],
  exports: [ConsentFormsService],
})
export class ConsentFormsModule {}
