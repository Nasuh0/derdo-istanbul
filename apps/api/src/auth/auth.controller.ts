import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { CookieOptions, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { AuthenticatedUser } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.register(dto);
    this.setRefreshCookie(response, session.refreshToken, session.refreshTokenExpiresIn);
    return this.withoutRefreshToken(session);
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(dto);
    this.setRefreshCookie(response, session.refreshToken, session.refreshTokenExpiresIn);
    return this.withoutRefreshToken(session);
  }

  @Post("refresh")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[this.cookieName()] as string | undefined;
    if (!token) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const session = await this.auth.refresh(token);
    this.setRefreshCookie(response, session.refreshToken, session.refreshTokenExpiresIn);
    return this.withoutRefreshToken(session);
  }

  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[this.cookieName()] as string | undefined;
    await this.auth.logout(token);
    response.clearCookie(this.cookieName(), this.cookieOptions());
    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  private withoutRefreshToken(session: {
    user: unknown;
    accessToken: string;
    accessTokenExpiresIn: number;
    refreshToken: string;
    refreshTokenExpiresIn: number;
  }) {
    return {
      user: session.user,
      accessToken: session.accessToken,
      accessTokenExpiresIn: session.accessTokenExpiresIn
    };
  }

  private setRefreshCookie(response: Response, token: string, ttlSeconds: number): void {
    response.cookie(this.cookieName(), token, {
      ...this.cookieOptions(),
      maxAge: ttlSeconds * 1000
    });
  }

  private cookieName(): string {
    return this.config.get<string>("REFRESH_COOKIE_NAME", "derdo_refresh");
  }

  private cookieOptions(): CookieOptions {
    const sameSite = this.config.get<string>("COOKIE_SAME_SITE", "strict") as "strict" | "lax" | "none";
    return {
      httpOnly: true,
      secure: this.config.get<string>("COOKIE_SECURE", "false") === "true",
      sameSite,
      path: "/api/auth"
    };
  }
}
