CREATE TABLE "voice_channels" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(64) NOT NULL,
  "slug" VARCHAR(64) NOT NULL,
  "type" "RoomType" NOT NULL DEFAULT 'PUBLIC',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "voice_channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "voice_channel_members" (
  "channel_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "voice_channel_members_pkey" PRIMARY KEY ("channel_id", "user_id")
);

CREATE UNIQUE INDEX "voice_channels_slug_key" ON "voice_channels"("slug");
CREATE INDEX "voice_channels_type_idx" ON "voice_channels"("type");
CREATE INDEX "voice_channel_members_user_id_idx" ON "voice_channel_members"("user_id");

ALTER TABLE "voice_channel_members"
  ADD CONSTRAINT "voice_channel_members_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "voice_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "voice_channel_members"
  ADD CONSTRAINT "voice_channel_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "voice_channels" ("id", "name", "slug", "type", "created_at", "updated_at")
VALUES (
  '00000000-0000-4000-8000-000000000101',
  'Genel Ses',
  'genel-ses',
  'PUBLIC',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
