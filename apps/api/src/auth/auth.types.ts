import type { UserRole } from "../generated/prisma/enums";

export type TokenType = "access" | "refresh";

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  ver: number;
  tokenType: TokenType;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  tokenVersion: number;
}
