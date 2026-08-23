-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('ISSUED', 'ESCALATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FacilityIncidentType" AS ENUM ('UNAUTHORIZED_ENTRY', 'ALTERCATION', 'LOST_ITEM', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetDirection" AS ENUM ('OUT', 'IN');

-- CreateEnum
CREATE TYPE "PickupRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AuthorizedPickupPerson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "photoUrl" TEXT,
    "studentId" TEXT NOT NULL,
    "addedByGuardianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorizedPickupPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "photoUrl" TEXT,
    "hostStaffId" TEXT,
    "signedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedOutAt" TIMESTAMP(3),

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatePass" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestedByGuardianId" TEXT,
    "pickupPersonName" TEXT NOT NULL,
    "pickupPersonPhone" TEXT,
    "verifiedAgainstAuthorizedList" BOOLEAN NOT NULL,
    "status" "GatePassStatus" NOT NULL,
    "issuedByStaffId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "GatePass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "pickupTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PickupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateArrival" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "notifiedClassTeacher" BOOLEAN NOT NULL DEFAULT false,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LateArrival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityIncident" (
    "id" TEXT NOT NULL,
    "type" "FacilityIncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "partiesInvolved" TEXT,
    "actionTaken" TEXT,
    "loggedByStaffId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMovement" (
    "id" TEXT NOT NULL,
    "assetDescription" TEXT NOT NULL,
    "direction" "AssetDirection" NOT NULL,
    "reason" TEXT,
    "loggedByStaffId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorizedPickupPerson_studentId_idx" ON "AuthorizedPickupPerson"("studentId");

-- CreateIndex
CREATE INDEX "Visitor_signedInAt_idx" ON "Visitor"("signedInAt");

-- CreateIndex
CREATE INDEX "GatePass_issuedAt_idx" ON "GatePass"("issuedAt");

-- CreateIndex
CREATE INDEX "GatePass_status_idx" ON "GatePass"("status");

-- CreateIndex
CREATE INDEX "PickupRequest_status_idx" ON "PickupRequest"("status");

-- CreateIndex
CREATE INDEX "LateArrival_loggedAt_idx" ON "LateArrival"("loggedAt");

-- CreateIndex
CREATE INDEX "FacilityIncident_loggedAt_idx" ON "FacilityIncident"("loggedAt");

-- CreateIndex
CREATE INDEX "AssetMovement_loggedAt_idx" ON "AssetMovement"("loggedAt");

-- AddForeignKey
ALTER TABLE "AuthorizedPickupPerson" ADD CONSTRAINT "AuthorizedPickupPerson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedPickupPerson" ADD CONSTRAINT "AuthorizedPickupPerson_addedByGuardianId_fkey" FOREIGN KEY ("addedByGuardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_hostStaffId_fkey" FOREIGN KEY ("hostStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_issuedByStaffId_fkey" FOREIGN KEY ("issuedByStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupRequest" ADD CONSTRAINT "PickupRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupRequest" ADD CONSTRAINT "PickupRequest_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LateArrival" ADD CONSTRAINT "LateArrival_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityIncident" ADD CONSTRAINT "FacilityIncident_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
