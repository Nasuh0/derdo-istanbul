CREATE TABLE "attachments" (
  "id" TEXT NOT NULL,
  "uploader_id" TEXT NOT NULL,
  "chat_message_id" TEXT,
  "direct_message_id" TEXT,
  "provider" VARCHAR(32) NOT NULL DEFAULT 'cloudinary',
  "public_id" VARCHAR(255) NOT NULL,
  "url" TEXT NOT NULL,
  "mime_type" VARCHAR(64) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "actor_id" TEXT,
  "action" VARCHAR(80) NOT NULL,
  "target_type" VARCHAR(80) NOT NULL,
  "target_id" VARCHAR(80),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attachments_public_id_key" ON "attachments"("public_id");
CREATE INDEX "attachments_uploader_id_created_at_idx" ON "attachments"("uploader_id", "created_at");
CREATE INDEX "attachments_chat_message_id_idx" ON "attachments"("chat_message_id");
CREATE INDEX "attachments_direct_message_id_idx" ON "attachments"("direct_message_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_uploader_id_fkey"
  FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_chat_message_id_fkey"
  FOREIGN KEY ("chat_message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_direct_message_id_fkey"
  FOREIGN KEY ("direct_message_id") REFERENCES "direct_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
