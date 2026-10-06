function positiveInt(value: unknown, fallback: number, name: string): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function validateEnv(raw: Record<string, unknown>) {
  const databaseUrl = String(raw.DATABASE_URL ?? "");
  const redisUrl = String(raw.REDIS_URL ?? "");
  const accessSecret = String(raw.JWT_ACCESS_SECRET ?? "");
  const refreshSecret = String(raw.JWT_REFRESH_SECRET ?? "");
  const livekitUrl = String(raw.LIVEKIT_URL ?? "");
  const livekitKey = String(raw.LIVEKIT_API_KEY ?? "");
  const livekitSecret = String(raw.LIVEKIT_API_SECRET ?? "");
  const cloudName = String(raw.CLOUDINARY_CLOUD_NAME ?? "");
  const cloudKey = String(raw.CLOUDINARY_API_KEY ?? "");
  const cloudSecret = String(raw.CLOUDINARY_API_SECRET ?? "");

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string");
  }
  if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
    throw new Error("REDIS_URL must be a Redis connection string");
  }
  if (accessSecret.length < 32 || refreshSecret.length < 32) {
    throw new Error("JWT secrets must each be at least 32 characters long");
  }
  if (accessSecret === refreshSecret) {
    throw new Error("Access and refresh JWT secrets must be different");
  }
  if (!livekitUrl.startsWith("ws://") && !livekitUrl.startsWith("wss://")) {
    throw new Error("LIVEKIT_URL must start with ws:// or wss://");
  }
  if (!livekitKey || livekitSecret.length < 16) {
    throw new Error("LIVEKIT credentials are required");
  }
  if (!cloudName || !cloudKey || !cloudSecret) {
    throw new Error("Cloudinary credentials are required");
  }

  const bcryptRounds = positiveInt(raw.BCRYPT_ROUNDS, 12, "BCRYPT_ROUNDS");
  if (bcryptRounds < 10 || bcryptRounds > 14) {
    throw new Error("BCRYPT_ROUNDS must be between 10 and 14");
  }

  const sameSite = String(raw.COOKIE_SAME_SITE ?? "strict").toLowerCase();
  if (!["strict", "lax", "none"].includes(sameSite)) {
    throw new Error("COOKIE_SAME_SITE must be strict, lax, or none");
  }

  const cookieSecure = String(raw.COOKIE_SECURE ?? "false") === "true";
  if (sameSite === "none" && !cookieSecure) {
    throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE=none");
  }
  if (String(raw.NODE_ENV ?? "development") === "production" && !cookieSecure) {
    throw new Error("COOKIE_SECURE must be true in production");
  }

  return {
    ...raw,
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    LIVEKIT_URL: livekitUrl,
    LIVEKIT_API_KEY: livekitKey,
    LIVEKIT_API_SECRET: livekitSecret,
    CLOUDINARY_CLOUD_NAME: cloudName,
    CLOUDINARY_API_KEY: cloudKey,
    CLOUDINARY_API_SECRET: cloudSecret,
    PORT: positiveInt(raw.PORT, 3000, "PORT"),
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    JWT_ACCESS_TTL_SECONDS: positiveInt(raw.JWT_ACCESS_TTL_SECONDS, 900, "JWT_ACCESS_TTL_SECONDS"),
    JWT_REFRESH_TTL_SECONDS: positiveInt(raw.JWT_REFRESH_TTL_SECONDS, 604800, "JWT_REFRESH_TTL_SECONDS"),
    LIVEKIT_TOKEN_TTL_SECONDS: positiveInt(raw.LIVEKIT_TOKEN_TTL_SECONDS, 300, "LIVEKIT_TOKEN_TTL_SECONDS"),
    MAX_IMAGE_UPLOAD_BYTES: positiveInt(raw.MAX_IMAGE_UPLOAD_BYTES, 8388608, "MAX_IMAGE_UPLOAD_BYTES"),
    BCRYPT_ROUNDS: bcryptRounds,
    COOKIE_SAME_SITE: sameSite
  };
}
