import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query("q") q?: string) {
    const search = q?.trim().slice(0, 32);
    return this.prisma.user.findMany({
      where: {
        isBanned: false,
        ...(search
          ? { username: { contains: search.toLowerCase(), mode: "insensitive" } }
          : {})
      },
      orderBy: { username: "asc" },
      take: 200,
      select: {
        id: true,
        username: true,
        role: true
      }
    });
  }
}
