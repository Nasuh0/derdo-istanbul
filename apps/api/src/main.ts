import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "./app.module";
import { RedisIoAdapter } from "./realtime/redis-io.adapter";
import { RedisService } from "./redis/redis.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const redis = app.get(RedisService);

  if (config.get<string>("TRUST_PROXY", "false") === "true") {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }

  await redis.connect();
  app.useWebSocketAdapter(new RedisIoAdapter(app, redis, config));

  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(cookieParser());

  const uploadDir = config.get<string>("UPLOAD_DIR", "/data/uploads");
  mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: "/media/" });

  const webDist = join(process.cwd(), "apps", "web", "dist");
  if (existsSync(webDist)) {
    app.useStaticAssets(webDist);
  }

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: config
      .get<string>("CORS_ORIGINS", "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false }
    })
  );
  app.enableShutdownHooks();

  const port = config.get<number>("PORT", 3000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
