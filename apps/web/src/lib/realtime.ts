import { io, type Socket } from "socket.io-client";
import { apiOrigin } from "./api";

export function connectRealtime(token: string): Socket {
  return io(`${apiOrigin()}/realtime`, {
    auth: { token },
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000
  });
}
