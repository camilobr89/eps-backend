-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('email', 'whatsapp', 'both');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "delivery_method" "DeliveryMethod" DEFAULT 'email',
ADD COLUMN     "email_error" TEXT,
ADD COLUMN     "email_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_error" TEXT,
ADD COLUMN     "whatsapp_sent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "whatsapp_notifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_number" VARCHAR(20);
