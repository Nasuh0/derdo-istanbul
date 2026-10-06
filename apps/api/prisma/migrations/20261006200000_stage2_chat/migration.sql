CREATE TYPE "RoomType" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "RoomMemberRole" AS ENUM ('OWNER', 'MEMBER');

CREATE TABLE "chat_rooms" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(64) NOT NULL,
  "slug" VARCHAR(64) NOT NULL,
  "type" "RoomType" NOT NULL DEFAULT 'PRIVATE',
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_room_members" (
  "room_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "RoomMemberRole" NOT NULL DEFAULT 'MEMBER',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_room_members_pkey" PRIMARY KEY ("room_id", "user_id")
);

CREATE TABLE "chat_messages" (
  "id" TEXT NOT NULL,
  "room_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "content" VARCHAR(4000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "direct_conversations" (
  "id" TEXT NOT NULL,
  "pair_key" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "direct_conversation_members" (
  "conversation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_conversation_members_pkey" PRIMARY KEY ("conversation_id", "user_id")
);

CREATE TABLE "direct_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "content" VARCHAR(4000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_rooms_slug_key" ON "chat_rooms"("slug");
CREATE INDEX "chat_rooms_type_idx" ON "chat_rooms"("type");
CREATE INDEX "chat_room_members_user_id_idx" ON "chat_room_members"("user_id");
CREATE INDEX "chat_messages_room_id_created_at_idx" ON "chat_messages"("room_id", "created_at");
CREATE INDEX "chat_messages_author_id_idx" ON "chat_messages"("author_id");
CREATE UNIQUE INDEX "direct_conversations_pair_key_key" ON "direct_conversations"("pair_key");
CREATE INDEX "direct_conversation_members_user_id_idx" ON "direct_conversation_members"("user_id");
CREATE INDEX "direct_messages_conversation_id_created_at_idx" ON "direct_messages"("conversation_id", "created_at");
CREATE INDEX "direct_messages_author_id_idx" ON "direct_messages"("author_id");

ALTER TABLE "chat_rooms"
  ADD CONSTRAINT "chat_rooms_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_room_members"
  ADD CONSTRAINT "chat_room_members_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_room_members"
  ADD CONSTRAINT "chat_room_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_conversation_members"
  ADD CONSTRAINT "direct_conversation_members_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_conversation_members"
  ADD CONSTRAINT "direct_conversation_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_messages"
  ADD CONSTRAINT "direct_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_messages"
  ADD CONSTRAINT "direct_messages_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "chat_rooms" ("id", "name", "slug", "type", "created_by_id", "created_at", "updated_at")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Genel',
  'genel',
  'PUBLIC',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
