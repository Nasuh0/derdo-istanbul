import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { AccessTokenService } from "../auth/access-token.service";
import { DirectService } from "../direct/direct.service";
import { RoomsService } from "../rooms/rooms.service";
import type { Ack, PresenceStatus, SocketData } from "./realtime.types";

type RealtimeSocket = Socket<any, any, any, SocketData>;

@WebSocketGateway({
  namespace: "/realtime",
  transports: ["websocket", "polling"]
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<any, any, any, SocketData>;

  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly rooms: RoomsService,
    private readonly direct: DirectService
  ) {}

  async handleConnection(client: RealtimeSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      const user = await this.accessTokens.authenticate(token);
      client.data.user = user;
      client.data.status = "online";
      await client.join(`user:${user.id}`);
      await this.emitPresence();
    } catch {
      client.emit("auth:error", { message: "Authentication failed" });
      client.disconnect(true);
    }
  }

  handleDisconnect(): void {
    setTimeout(() => {
      void this.emitPresence();
    }, 0);
  }

  @SubscribeMessage("presence:set")
  async setPresence(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: { status?: PresenceStatus }
  ): Promise<Ack> {
    const allowed: PresenceStatus[] = ["online", "away", "busy"];
    if (!payload?.status || !allowed.includes(payload.status)) {
      return { ok: false, error: "Invalid presence status" };
    }
    client.data.status = payload.status;
    await this.emitPresence();
    return { ok: true };
  }

  @SubscribeMessage("room:join")
  async joinRoom(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: { roomId?: string }
  ): Promise<Ack> {
    try {
      if (!payload?.roomId) throw new Error("roomId is required");
      const room = await this.rooms.assertAccess(client.data.user.id, payload.roomId);
      await client.join(`room:${room.id}`);
      return { ok: true, data: room };
    } catch (error) {
      return { ok: false, error: this.message(error) };
    }
  }

  @SubscribeMessage("room:leave")
  async leaveRoom(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: { roomId?: string }
  ): Promise<Ack> {
    if (!payload?.roomId) return { ok: false, error: "roomId is required" };
    await client.leave(`room:${payload.roomId}`);
    return { ok: true };
  }

  @SubscribeMessage("message:send")
  async sendRoomMessage(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: { roomId?: string; content?: string }
  ): Promise<Ack> {
    try {
      if (!payload?.roomId || typeof payload.content !== "string") {
        throw new Error("roomId and content are required");
      }
      const message = await this.rooms.createMessage(
        client.data.user.id,
        payload.roomId,
        payload.content
      );
      this.server.to(`room:${payload.roomId}`).emit("message:new", message);
      return { ok: true, data: message };
    } catch (error) {
      return { ok: false, error: this.message(error) };
    }
  }

  @SubscribeMessage("typing:start")
  async typingStart(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: { roomId?: string }
  ): Promise<Ack> {
    try {
      if (!payload?.roomId) throw new Error("roomId is required");
      await this.rooms.assertAccess(client.data.user.id, payload.roomId);
      client.to(`room:${payload.roomId}`).emit("typing:update", {
        roomId: payload.roomId,
        userId: client.data.user.id,
        username: client.data.user.username,
        typing: true
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.message(error) };
    }
  }

  @SubscribeMessage("typing:stop")
  async typingStop(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: { roomId?: string }
  ): Promise<Ack> {
    try {
      if (!payload?.roomId) throw new Error("roomId is required");
      await this.rooms.assertAccess(client.data.user.id, payload.roomId);
      client.to(`room:${payload.roomId}`).emit("typing:update", {
        roomId: payload.roomId,
        userId: client.data.user.id,
        username: client.data.user.username,
        typing: false
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.message(error) };
    }
  }

  @SubscribeMessage("dm:send")
  async sendDirectMessage(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: { conversationId?: string; content?: string }
  ): Promise<Ack> {
    try {
      if (!payload?.conversationId || typeof payload.content !== "string") {
        throw new Error("conversationId and content are required");
      }

      const result = await this.direct.createMessage(
        client.data.user.id,
        payload.conversationId,
        payload.content
      );

      for (const userId of result.memberIds) {
        this.server.to(`user:${userId}`).emit("dm:new", result.message);
      }

      return { ok: true, data: result.message };
    } catch (error) {
      return { ok: false, error: this.message(error) };
    }
  }

  private extractToken(client: RealtimeSocket): string {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim()) {
      return authToken.trim();
    }

    const authorization = client.handshake.headers.authorization;
    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice(7).trim();
    }

    return "";
  }

  private async emitPresence(): Promise<void> {
    const sockets = await this.server.fetchSockets();
    const users = new Map<string, { id: string; username: string; status: PresenceStatus }>();
    const rank: Record<PresenceStatus, number> = { away: 1, online: 2, busy: 3 };

    for (const socket of sockets) {
      const user = socket.data.user;
      if (!user) continue;
      const status = socket.data.status ?? "online";
      const current = users.get(user.id);
      if (!current || rank[status] > rank[current.status]) {
        users.set(user.id, {
          id: user.id,
          username: user.username,
          status
        });
      }
    }

    this.server.emit("presence:snapshot", Array.from(users.values()));
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : "Unexpected error";
  }
}
