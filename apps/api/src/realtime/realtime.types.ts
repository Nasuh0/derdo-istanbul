import type { AuthenticatedUser } from "../auth/auth.types";

export type PresenceStatus = "online" | "away" | "busy";

export interface SocketData {
  user: AuthenticatedUser;
  status: PresenceStatus;
}

export interface Ack<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
