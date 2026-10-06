CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "username" VARCHAR(32) NOT NULL,
  "password_hash" VARCHAR(100) NOT NULL,
  "refresh_token_hash" VARCHAR(64),
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "is_banned" BOOLEAN NOT NULL DEFAULT false,
  "token_version" INTEGER NOT NULL DEFAULT 0,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
