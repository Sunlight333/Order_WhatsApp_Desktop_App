-- Manual migration script to add traceability fields to customers table
-- Run this if the auto-migration doesn't work
-- Make sure the server is stopped before running this

-- Add createdById column (nullable to handle existing data)
ALTER TABLE "customers" ADD COLUMN "createdById" TEXT;

-- Add updatedById column (nullable to handle existing data)
ALTER TABLE "customers" ADD COLUMN "updatedById" TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "customers_createdById_idx" ON "customers"("createdById");
CREATE INDEX IF NOT EXISTS "customers_updatedById_idx" ON "customers"("updatedById");
