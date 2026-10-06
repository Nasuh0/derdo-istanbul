import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "./prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SkipThrottle({ default: true })
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      database: "up",
      timestamp: new Date().toISOString()
    };
  }
}
