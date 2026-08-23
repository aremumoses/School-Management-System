-- CreateEnum
CREATE TYPE "RollCallSession" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('GOOD', 'FAIR', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransportStaffRole" AS ENUM ('DRIVER', 'CONDUCTOR');

-- CreateEnum
CREATE TYPE "TransportRun" AS ENUM ('PICKUP', 'DROPOFF');

-- CreateEnum
CREATE TYPE "VehicleMaintenanceAlertThreshold" AS ENUM ('DUE_IN_14_DAYS', 'DUE_IN_7_DAYS', 'OVERDUE');

-- CreateTable
CREATE TABLE "Hostel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wardenStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hostel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "bedCapacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BedAllocation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedNumber" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BedAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollCall" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "session" "RollCallSession" NOT NULL,
    "markedByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RollCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollCallEntry" (
    "id" TEXT NOT NULL,
    "rollCallId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL,

    CONSTRAINT "RollCallEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "matchedAuthorizedPickupPerson" BOOLEAN NOT NULL DEFAULT false,
    "loggedByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelInventoryItem" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
    "studentId" TEXT,
    "description" TEXT NOT NULL,
    "condition" "InventoryCondition" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoarderHealthLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "loggedByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoarderHealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveOutingRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestedByGuardianId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByStaffId" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveOutingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportRoute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "busIdentifier" TEXT NOT NULL,
    "driverId" TEXT,
    "conductorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopName" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "approximateTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRouteAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRouteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportStaffRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "TransportStaffRole" NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiryDate" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStaffRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportAttendance" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "run" "TransportRun" NOT NULL,
    "markedByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportAttendanceEntry" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "boarded" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportAttendanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenanceRecord" (
    "id" TEXT NOT NULL,
    "busIdentifier" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "nextServiceDueDate" TIMESTAMP(3),
    "loggedByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenanceAlertLog" (
    "id" TEXT NOT NULL,
    "maintenanceRecordId" TEXT NOT NULL,
    "threshold" "VehicleMaintenanceAlertThreshold" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMaintenanceAlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hostel_name_key" ON "Hostel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Room_hostelId_roomNumber_key" ON "Room"("hostelId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BedAllocation_studentId_key" ON "BedAllocation"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BedAllocation_roomId_bedNumber_key" ON "BedAllocation"("roomId", "bedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RollCall_hostelId_date_session_key" ON "RollCall"("hostelId", "date", "session");

-- CreateIndex
CREATE UNIQUE INDEX "RollCallEntry_rollCallId_studentId_key" ON "RollCallEntry"("rollCallId", "studentId");

-- CreateIndex
CREATE INDEX "Visitation_studentId_idx" ON "Visitation"("studentId");

-- CreateIndex
CREATE INDEX "BoarderHealthLog_studentId_idx" ON "BoarderHealthLog"("studentId");

-- CreateIndex
CREATE INDEX "LeaveOutingRequest_studentId_idx" ON "LeaveOutingRequest"("studentId");

-- CreateIndex
CREATE INDEX "LeaveOutingRequest_status_idx" ON "LeaveOutingRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportRoute_name_key" ON "TransportRoute"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_order_key" ON "RouteStop"("routeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "StudentRouteAssignment_studentId_key" ON "StudentRouteAssignment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportAttendance_routeId_date_run_key" ON "TransportAttendance"("routeId", "date", "run");

-- CreateIndex
CREATE UNIQUE INDEX "TransportAttendanceEntry_attendanceId_studentId_key" ON "TransportAttendanceEntry"("attendanceId", "studentId");

-- CreateIndex
CREATE INDEX "VehicleMaintenanceRecord_busIdentifier_idx" ON "VehicleMaintenanceRecord"("busIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMaintenanceAlertLog_maintenanceRecordId_threshold_key" ON "VehicleMaintenanceAlertLog"("maintenanceRecordId", "threshold");

-- AddForeignKey
ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_wardenStaffId_fkey" FOREIGN KEY ("wardenStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedAllocation" ADD CONSTRAINT "BedAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedAllocation" ADD CONSTRAINT "BedAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollCall" ADD CONSTRAINT "RollCall_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollCall" ADD CONSTRAINT "RollCall_markedByStaffId_fkey" FOREIGN KEY ("markedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollCallEntry" ADD CONSTRAINT "RollCallEntry_rollCallId_fkey" FOREIGN KEY ("rollCallId") REFERENCES "RollCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollCallEntry" ADD CONSTRAINT "RollCallEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitation" ADD CONSTRAINT "Visitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitation" ADD CONSTRAINT "Visitation_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelInventoryItem" ADD CONSTRAINT "HostelInventoryItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelInventoryItem" ADD CONSTRAINT "HostelInventoryItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoarderHealthLog" ADD CONSTRAINT "BoarderHealthLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoarderHealthLog" ADD CONSTRAINT "BoarderHealthLog_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveOutingRequest" ADD CONSTRAINT "LeaveOutingRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveOutingRequest" ADD CONSTRAINT "LeaveOutingRequest_requestedByGuardianId_fkey" FOREIGN KEY ("requestedByGuardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveOutingRequest" ADD CONSTRAINT "LeaveOutingRequest_decidedByStaffId_fkey" FOREIGN KEY ("decidedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaffRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "TransportStaffRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "RouteStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAttendance" ADD CONSTRAINT "TransportAttendance_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAttendance" ADD CONSTRAINT "TransportAttendance_markedByStaffId_fkey" FOREIGN KEY ("markedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAttendanceEntry" ADD CONSTRAINT "TransportAttendanceEntry_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "TransportAttendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAttendanceEntry" ADD CONSTRAINT "TransportAttendanceEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenanceAlertLog" ADD CONSTRAINT "VehicleMaintenanceAlertLog_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "VehicleMaintenanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
