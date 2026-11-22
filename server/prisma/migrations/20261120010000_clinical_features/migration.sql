-- AlterEnum
ALTER TYPE "NoteType" ADD VALUE 'ROUND';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "noKnownAllergies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weightKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "ip" TEXT,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "path" TEXT,
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "status" INTEGER;

-- AlterTable
ALTER TABLE "VitalSign" ADD COLUMN     "gcsEye" INTEGER,
ADD COLUMN     "gcsIntubated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gcsMotor" INTEGER,
ADD COLUMN     "gcsVerbal" INTEGER,
ADD COLUMN     "painScale" TEXT,
ADD COLUMN     "painScore" INTEGER,
ADD COLUMN     "rass" INTEGER,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "overdueAlertFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MedicationAdministration" ADD COLUMN     "chartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VentilatorSetting" ADD COLUMN     "pao2" DOUBLE PRECISION,
ADD COLUMN     "peep" DOUBLE PRECISION,
ADD COLUMN     "plateau" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PatientLine" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "site" TEXT,
    "size" TEXT,
    "insertedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "removalReason" TEXT,
    "notes" TEXT,
    "insertedById" TEXT NOT NULL,
    "removedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineBundleCheck" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineBundleCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalScore" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "components" JSONB NOT NULL,
    "inputs" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarSignOff" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summary" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "note" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarSignOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientError" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientLine_patientId_idx" ON "PatientLine"("patientId");

-- CreateIndex
CREATE INDEX "LineBundleCheck_lineId_idx" ON "LineBundleCheck"("lineId");

-- CreateIndex
CREATE INDEX "ClinicalScore_patientId_type_idx" ON "ClinicalScore"("patientId", "type");

-- CreateIndex
CREATE INDEX "MarSignOff_patientId_periodStart_idx" ON "MarSignOff"("patientId", "periodStart");

-- CreateIndex
CREATE INDEX "ProcessedRequest_createdAt_idx" ON "ProcessedRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ClientError_createdAt_idx" ON "ClientError"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_patientId_idx" ON "AuditLog"("patientId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientLine" ADD CONSTRAINT "PatientLine_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientLine" ADD CONSTRAINT "PatientLine_insertedById_fkey" FOREIGN KEY ("insertedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientLine" ADD CONSTRAINT "PatientLine_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineBundleCheck" ADD CONSTRAINT "LineBundleCheck_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PatientLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineBundleCheck" ADD CONSTRAINT "LineBundleCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalScore" ADD CONSTRAINT "ClinicalScore_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalScore" ADD CONSTRAINT "ClinicalScore_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarSignOff" ADD CONSTRAINT "MarSignOff_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarSignOff" ADD CONSTRAINT "MarSignOff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

