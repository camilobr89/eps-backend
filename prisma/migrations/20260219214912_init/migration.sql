-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CC', 'TI', 'RC', 'CE', 'PA');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('urgente', 'alta', 'normal', 'baja');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('pending', 'scheduled', 'completed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('expiration_warning', 'appointment_reminder', 'ocr_completed', 'ocr_failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eps_providers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(20),
    "parser_key" VARCHAR(50) NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eps_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "eps_provider_id" UUID,
    "full_name" VARCHAR(200) NOT NULL,
    "document_type" "DocumentType",
    "document_number" VARCHAR(20),
    "birth_date" DATE,
    "address" VARCHAR(300),
    "phone" VARCHAR(20),
    "cellphone" VARCHAR(20),
    "email" VARCHAR(255),
    "department" VARCHAR(100),
    "city" VARCHAR(100),
    "regime" VARCHAR(50),
    "relationship" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorizations" (
    "id" UUID NOT NULL,
    "family_member_id" UUID NOT NULL,
    "eps_provider_id" UUID,
    "document_type" VARCHAR(50) NOT NULL,
    "request_number" VARCHAR(50),
    "issuing_date" TIMESTAMPTZ,
    "expiration_date" DATE,
    "diagnosis_code" VARCHAR(20),
    "diagnosis_description" TEXT,
    "patient_location" VARCHAR(50),
    "service_origin" VARCHAR(50),
    "provider_name" VARCHAR(200),
    "provider_nit" VARCHAR(20),
    "provider_code" VARCHAR(20),
    "provider_address" VARCHAR(300),
    "provider_phone" VARCHAR(30),
    "provider_department" VARCHAR(100),
    "provider_city" VARCHAR(100),
    "payment_type" VARCHAR(30),
    "copay_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "copay_percentage" DECIMAL(5,2),
    "max_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "weeks_contributed" INTEGER,
    "priority" "Priority" NOT NULL DEFAULT 'normal',
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'pending',
    "original_file_url" TEXT,
    "ocr_raw_text" TEXT,
    "ocr_confidence" DECIMAL(3,2),
    "ocr_parser_used" VARCHAR(50),
    "manually_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorization_services" (
    "id" UUID NOT NULL,
    "authorization_id" UUID NOT NULL,
    "service_code" VARCHAR(20) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "service_name" TEXT NOT NULL,
    "service_type" VARCHAR(30),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "authorization_id" UUID,
    "authorization_service_id" UUID,
    "family_member_id" UUID NOT NULL,
    "appointment_date" TIMESTAMPTZ NOT NULL,
    "location" VARCHAR(300),
    "doctor_name" VARCHAR(200),
    "specialty" VARCHAR(100),
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "authorization_id" UUID NOT NULL,
    "file_name" VARCHAR(255),
    "file_url" TEXT NOT NULL,
    "file_type" VARCHAR(10),
    "file_size_bytes" INTEGER,
    "ocr_status" "OcrStatus" NOT NULL DEFAULT 'pending',
    "ocr_error_message" TEXT,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "message" TEXT,
    "type" "NotificationType",
    "related_entity_type" VARCHAR(30),
    "related_entity_id" UUID,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "eps_providers_code_key" ON "eps_providers"("code");

-- CreateIndex
CREATE INDEX "idx_authorizations_expiration" ON "authorizations"("expiration_date");

-- CreateIndex
CREATE INDEX "idx_authorizations_family_member" ON "authorizations"("family_member_id");

-- CreateIndex
CREATE INDEX "idx_authorizations_status" ON "authorizations"("status");

-- CreateIndex
CREATE INDEX "idx_appointments_date" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "idx_appointments_family_member" ON "appointments"("family_member_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_unread" ON "notifications"("user_id");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_eps_provider_id_fkey" FOREIGN KEY ("eps_provider_id") REFERENCES "eps_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_eps_provider_id_fkey" FOREIGN KEY ("eps_provider_id") REFERENCES "eps_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_services" ADD CONSTRAINT "authorization_services_authorization_id_fkey" FOREIGN KEY ("authorization_id") REFERENCES "authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_authorization_id_fkey" FOREIGN KEY ("authorization_id") REFERENCES "authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_authorization_service_id_fkey" FOREIGN KEY ("authorization_service_id") REFERENCES "authorization_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_authorization_id_fkey" FOREIGN KEY ("authorization_id") REFERENCES "authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
