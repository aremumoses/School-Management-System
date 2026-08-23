import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TransportStaffRecord } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import {
  CreateRouteAssignmentDto,
  CreateRouteDto,
  CreateRouteStopDto,
  CreateTransportStaffRecordDto,
  UpdateRouteDto,
  UpdateRouteStopDto,
  UpdateTransportStaffRecordDto,
} from './dto/transport.dto';

const ROUTE_INCLUDE = {
  driver: true,
  conductor: true,
  stops: { orderBy: { order: 'asc' as const } },
  _count: { select: { studentAssignments: true } },
} as const;

@Injectable()
export class TransportRoutesService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Routes
  // -------------------------------------------------------------------

  listRoutes() {
    return this.prisma.transportRoute.findMany({
      include: ROUTE_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  async getRoute(id: string) {
    const route = await this.prisma.transportRoute.findUnique({
      where: { id },
      include: ROUTE_INCLUDE,
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  async createRoute(dto: CreateRouteDto) {
    try {
      return await this.prisma.transportRoute.create({
        data: {
          name: dto.name,
          busIdentifier: dto.busIdentifier,
          driverId: dto.driverId ?? null,
          conductorId: dto.conductorId ?? null,
        },
        include: ROUTE_INCLUDE,
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A route with this name already exists',
      );
    }
  }

  async updateRoute(id: string, dto: UpdateRouteDto) {
    await this.getRouteOrThrow(id);
    try {
      return await this.prisma.transportRoute.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.busIdentifier !== undefined && {
            busIdentifier: dto.busIdentifier,
          }),
          ...(dto.driverId !== undefined && { driverId: dto.driverId }),
          ...(dto.conductorId !== undefined && {
            conductorId: dto.conductorId,
          }),
        },
        include: ROUTE_INCLUDE,
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A route with this name already exists',
      );
    }
  }

  private async getRouteOrThrow(id: string) {
    const route = await this.prisma.transportRoute.findUnique({
      where: { id },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  // -------------------------------------------------------------------
  // Stops
  // -------------------------------------------------------------------

  async createStop(routeId: string, dto: CreateRouteStopDto) {
    await this.getRouteOrThrow(routeId);
    try {
      return await this.prisma.routeStop.create({
        data: {
          routeId,
          stopName: dto.stopName,
          order: dto.order,
          approximateTime: dto.approximateTime ?? null,
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'This route already has a stop at this order position',
      );
    }
  }

  async updateStop(id: string, dto: UpdateRouteStopDto) {
    const stop = await this.prisma.routeStop.findUnique({ where: { id } });
    if (!stop) throw new NotFoundException('Stop not found');
    try {
      return await this.prisma.routeStop.update({
        where: { id },
        data: {
          ...(dto.stopName !== undefined && { stopName: dto.stopName }),
          ...(dto.order !== undefined && { order: dto.order }),
          ...(dto.approximateTime !== undefined && {
            approximateTime: dto.approximateTime,
          }),
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'This route already has a stop at this order position',
      );
    }
  }

  async deleteStop(id: string): Promise<void> {
    const stop = await this.prisma.routeStop.findUnique({ where: { id } });
    if (!stop) throw new NotFoundException('Stop not found');
    try {
      await this.prisma.routeStop.delete({ where: { id } });
    } catch (error) {
      translatePrismaError(
        error,
        'This stop still has students assigned to it — reassign them first',
      );
    }
  }

  // -------------------------------------------------------------------
  // Student-route assignment
  // -------------------------------------------------------------------

  async assignStudent(dto: CreateRouteAssignmentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    const stop = await this.prisma.routeStop.findUnique({
      where: { id: dto.stopId },
    });
    if (!stop) throw new NotFoundException('Stop not found');
    if (stop.routeId !== dto.routeId) {
      throw new BadRequestException(
        'This stop does not belong to the given route',
      );
    }

    return this.prisma.studentRouteAssignment.upsert({
      where: { studentId: dto.studentId },
      update: { routeId: dto.routeId, stopId: dto.stopId },
      create: {
        studentId: dto.studentId,
        routeId: dto.routeId,
        stopId: dto.stopId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        route: true,
        stop: true,
      },
    });
  }

  async removeAssignment(studentId: string): Promise<void> {
    const assignment = await this.prisma.studentRouteAssignment.findUnique({
      where: { studentId },
    });
    if (!assignment)
      throw new NotFoundException('This student has no route assignment');
    await this.prisma.studentRouteAssignment.delete({ where: { studentId } });
  }

  listAssignments(routeId?: string) {
    return this.prisma.studentRouteAssignment.findMany({
      where: { ...(routeId && { routeId }) },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        route: true,
        stop: true,
      },
      orderBy: { student: { firstName: 'asc' } },
    });
  }

  // -------------------------------------------------------------------
  // Driver / conductor records
  // -------------------------------------------------------------------

  listStaffRecords(role?: 'DRIVER' | 'CONDUCTOR') {
    return this.prisma.transportStaffRecord.findMany({
      where: { ...(role && { role }) },
      orderBy: { name: 'asc' },
    });
  }

  createStaffRecord(
    dto: CreateTransportStaffRecordDto,
  ): Promise<TransportStaffRecord> {
    return this.prisma.transportStaffRecord.create({
      data: {
        name: dto.name,
        role: dto.role,
        phone: dto.phone,
        licenseNumber: dto.licenseNumber ?? null,
        licenseExpiryDate: dto.licenseExpiryDate
          ? new Date(dto.licenseExpiryDate)
          : null,
        verified: dto.verified ?? false,
      },
    });
  }

  async updateStaffRecord(
    id: string,
    dto: UpdateTransportStaffRecordDto,
  ): Promise<TransportStaffRecord> {
    const record = await this.prisma.transportStaffRecord.findUnique({
      where: { id },
    });
    if (!record)
      throw new NotFoundException('Driver/conductor record not found');
    return this.prisma.transportStaffRecord.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.licenseNumber !== undefined && {
          licenseNumber: dto.licenseNumber,
        }),
        ...(dto.licenseExpiryDate !== undefined && {
          licenseExpiryDate: dto.licenseExpiryDate
            ? new Date(dto.licenseExpiryDate)
            : null,
        }),
        ...(dto.verified !== undefined && { verified: dto.verified }),
      },
    });
  }
}
