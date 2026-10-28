BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Rsvp"
    WHERE (cardinality("dietary") > 0 AND "dietaryEncrypted" IS NULL)
       OR ("allergySeverity" IS NOT NULL AND "allergySeverityEncrypted" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Encrypt legacy RSVP health fields with the application key before deploying this migration';
  END IF;
END $$;

ALTER TABLE "Rsvp" DROP COLUMN "dietary", DROP COLUMN "allergySeverity";

COMMIT;