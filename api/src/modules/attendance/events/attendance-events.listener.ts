import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BroadcastsService } from '../../communication/broadcasts.service';
import {
  ATTENDANCE_ABSENCE_EVENT,
  AttendanceAbsenceEvent,
} from './attendance-absence.event';

/**
 * docs/16-module-communication.md §2 "Attendance alert -> Push + SMS" —
 * the real send Stage 7 wires in. Fire-and-forget (same as the rest of
 * this event-emitter pub/sub — see app.module.ts's comment): a guardian
 * notification failing must never roll back or block the attendance mark
 * that triggered it, so any error here is caught and logged, not thrown.
 */
@Injectable()
export class AttendanceEventsListener {
  private readonly logger = new Logger(AttendanceEventsListener.name);

  constructor(private readonly broadcastsService: BroadcastsService) {}

  @OnEvent(ATTENDANCE_ABSENCE_EVENT)
  async handleAbsence(event: AttendanceAbsenceEvent): Promise<void> {
    try {
      await this.broadcastsService.sendAbsenceAlert({
        studentId: event.studentId,
        status: event.status,
        date: event.date,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send absence alert for student ${event.studentId} on ${event.date}: ${message}`,
      );
    }
  }
}
