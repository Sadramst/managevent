-- Data-only migration: Managevent is English (en-AU) only for now.
-- Normalises rows that referenced the removed Persian locale and the removed `persian-azure` theme.
-- No schema changes. Ceremony slugs (CeremonyType / Package / Event) are intentionally untouched
-- because retiring them is a content decision; remove or archive any retired Persian ceremony rows through the CMS/admin.

UPDATE "User" SET "locale" = 'en' WHERE "locale" = 'fa';
UPDATE "Lead" SET "preferredLanguage" = 'en' WHERE "preferredLanguage" = 'fa';
UPDATE "BuilderSession" SET "locale" = 'en' WHERE "locale" = 'fa';
UPDATE "Message" SET "locale" = 'en' WHERE "locale" = 'fa';
UPDATE "ConsentRecord" SET "locale" = 'en' WHERE "locale" = 'fa';

UPDATE "Invitation" SET "themeId" = 'emerald-botanic' WHERE "themeId" = 'persian-azure';
UPDATE "Invitation" SET "defaultLanguage" = 'en' WHERE "defaultLanguage" = 'fa';
UPDATE "Invitation" SET "languages" = ARRAY['en']::TEXT[] WHERE 'fa' = ANY("languages");
