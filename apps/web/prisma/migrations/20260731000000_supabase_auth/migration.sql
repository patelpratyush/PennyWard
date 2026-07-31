-- Move identity to Supabase Auth.
--
-- Supabase now owns credentials, email confirmation and OAuth in `auth.users`.
-- The public "User" table is retained purely as a profile mirror so the domain
-- tables keep a foreign-key target inside the schema Prisma manages; its `id`
-- holds the Supabase auth uuid verbatim, which is why no other table's column
-- types had to change.

-- Auth.js-only tables.
DROP TABLE IF EXISTS "accounts";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";

-- Credentials and email confirmation are Supabase's responsibility now.
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
