import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, timingSafeEqual } from "node:crypto";
import type { User } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./auth.types";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const username = this.normalizeUsername(dto.username);
    this.assertBcryptPasswordSize(dto.password);

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException("Username is already in use");
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.get<number>("BCRYPT_ROUNDS", 12)
    );

    const user = await this.prisma.user.create({
      data: { username, passwordHash }
    });

    return this.createSession(user);
  }

  async login(dto: LoginDto) {
    const username = this.normalizeUsername(dto.username);
    this.assertBcryptPasswordSize(dto.password);

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      await bcrypt.hash(dto.password, this.config.get<number>("BCRYPT_ROUNDS", 12));
      throw new UnauthorizedException("Invalid username or password");
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword || user.isBanned) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return this.createSession(updated);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        algorithms: ["HS256"],
        issuer: this.config.get<string>("JWT_ISSUER", "derdo-api"),
        audience: this.config.get<string>("JWT_AUDIENCE", "derdo-web")
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (payload.tokenType !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (
      !user ||
      user.isBanned ||
      user.tokenVersion !== payload.ver ||
      !user.refreshTokenHash ||
      !this.safeHashEquals(refreshToken, user.refreshTokenHash)
    ) {
      throw new UnauthorizedException("Refresh session is no longer valid");
    }

    return this.createSession(user);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        algorithms: ["HS256"],
        issuer: this.config.get<string>("JWT_ISSUER", "derdo-api"),
        audience: this.config.get<string>("JWT_AUDIENCE", "derdo-web"),
        ignoreExpiration: true
      });

      await this.prisma.user.updateMany({
        where: { id: payload.sub, tokenVersion: payload.ver },
        data: {
          refreshTokenHash: null,
          tokenVersion: { increment: 1 }
        }
      });
    } catch {
      return;
    }
  }

  private async createSession(user: User) {
    const common = {
      sub: user.id,
      username: user.username,
      role: user.role,
      ver: user.tokenVersion
    };

    const accessTtl = this.config.get<number>("JWT_ACCESS_TTL_SECONDS", 900);
    const refreshTtl = this.config.get<number>("JWT_REFRESH_TTL_SECONDS", 604800);
    const issuer = this.config.get<string>("JWT_ISSUER", "derdo-api");
    const audience = this.config.get<string>("JWT_AUDIENCE", "derdo-web");

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...common, tokenType: "access" } satisfies JwtPayload,
        {
          secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
          algorithm: "HS256",
          expiresIn: accessTtl,
          issuer,
          audience
        }
      ),
      this.jwt.signAsync(
        { ...common, tokenType: "refresh" } satisfies JwtPayload,
        {
          secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
          algorithm: "HS256",
          expiresIn: refreshTtl,
          issuer,
          audience
        }
      )
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: this.hashToken(refreshToken) }
    });

    return {
      user: this.publicUser(user),
      accessToken,
      accessTokenExpiresIn: accessTtl,
      refreshToken,
      refreshTokenExpiresIn: refreshTtl
    };
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  private normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
  }

  private assertBcryptPasswordSize(password: string): void {
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new UnauthorizedException("Password is too long for bcrypt");
    }
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private safeHashEquals(token: string, storedHash: string): boolean {
    const actual = Buffer.from(this.hashToken(token), "hex");
    const expected = Buffer.from(storedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
