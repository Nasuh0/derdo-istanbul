import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "./prisma/prisma.service";
import { RedisService } from "./redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  @Get()
  @SkipThrottle({ default: true })
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    const redis = await this.redis.pubClient.ping();
    return {
      ok: redis === "PONG",
      database: "up",
      redis: redis === "PONG" ? "up" : "down",
      timestamp: new Date().toISOString()
    };
  }
}
