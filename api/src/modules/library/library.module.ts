import { Module } from '@nestjs/common';
import { CommunicationModule } from '../communication/communication.module';
import { FeesModule } from '../fees/fees.module';
import { LibraryAnalyticsController } from './analytics.controller';
import { LibraryAnalyticsService } from './analytics.service';
import { LibraryBulkImportController } from './bulk-import/bulk-import.controller';
import { LibraryBulkImportService } from './bulk-import/bulk-import.service';
import { CirculationController } from './circulation.controller';
import { CirculationService } from './circulation.service';
import {
  LibrarySettingsController,
  LibraryController,
} from './library.controller';
import { LibraryService } from './library.service';
import { LibrarySettingsService } from './library-settings.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { LibraryOverdueController } from './overdue.controller';
import { LibraryOverdueService } from './overdue.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [CommunicationModule, FeesModule],
  controllers: [
    LibraryController,
    LibrarySettingsController,
    LibraryBulkImportController,
    CirculationController,
    ReservationsController,
    MembersController,
    LibraryOverdueController,
    LibraryAnalyticsController,
  ],
  providers: [
    LibraryService,
    LibrarySettingsService,
    LibraryBulkImportService,
    CirculationService,
    ReservationsService,
    MembersService,
    LibraryOverdueService,
    LibraryAnalyticsService,
  ],
})
export class LibraryModule {}
