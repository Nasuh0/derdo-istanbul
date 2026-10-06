import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser, JwtPayload } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing access token");
    }

    const token = authorization.slice(7).trim();
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        algorithms: ["HS256"],
        issuer: this.config.get<string>("JWT_ISSUER", "derdo-api"),
        audience: this.config.get<string>("JWT_AUDIENCE", "derdo-web")
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    if (payload.tokenType !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        role: true,
        isBanned: true,
        tokenVersion: true
      }
    });

    if (!user || user.isBanned || user.tokenVersion !== payload.ver) {
      throw new UnauthorizedException("Session is no longer valid");
    }

    request.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion
    };
    return true;
  }
}
