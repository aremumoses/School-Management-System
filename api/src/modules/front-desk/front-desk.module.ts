import { Module } from '@nestjs/common';
import { CommunicationModule } from '../communication/communication.module';
import {
  FrontDeskController,
  PickupAuthorizationController,
} from './front-desk.controller';
import { FrontDeskService } from './front-desk.service';

@Module({
  imports: [CommunicationModule],
  controllers: [PickupAuthorizationController, FrontDeskController],
  providers: [FrontDeskService],
  exports: [FrontDeskService],
})
export class FrontDeskModule {}
