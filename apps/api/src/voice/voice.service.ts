import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VoiceService {
  private readonly rooms: RoomServiceClient | null;
  private readonly livekitUrl: string;
  private readonly livekitKey: string;
  private readonly livekitSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.livekitUrl = config.get<string>("LIVEKIT_URL", "").trim();
    this.livekitKey = config.get<string>("LIVEKIT_API_KEY", "").trim();
    this.livekitSecret = config.get<string>("LIVEKIT_API_SECRET", "").trim();

    if (this.livekitUrl && this.livekitKey && this.livekitSecret) {
      const serviceUrl = this.livekitUrl
        .replace(/^wss:\/\//, "https://")
        .replace(/^ws:\/\//, "http://");

      this.rooms = new RoomServiceClient(
        serviceUrl,
        this.livekitKey,
        this.livekitSecret
      );
    } else {
      this.rooms = null;
    }
  }

  async listForUser(userId: string) {
    if (!this.rooms) return [];

    return this.prisma.voiceChannel.findMany({
      where: {
        OR: [
          { type: "PUBLIC" },
          { members: { some: { userId } } }
        ]
      },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        type: true
      }
    });
  }

  async issueJoinToken(user: { id: string; username: string }, channelId: string) {
    if (!this.rooms) {
      throw new ServiceUnavailableException("Voice service is not configured yet");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isBanned: true }
    });
    if (!dbUser || dbUser.isBanned) {
      throw new ForbiddenException("Voice access denied");
    }

    const channel = await this.prisma.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        name: true,
        type: true,
        members: {
          where: { userId: user.id },
          select: { userId: true }
        }
      }
    });

    if (!channel) throw new NotFoundException("Voice channel not found");
    if (channel.type === "PRIVATE" && channel.members.length === 0) {
      throw new ForbiddenException("You do not have access to this voice channel");
    }

    const roomName = `voice:${channel.id}`;
    const ttl = this.config.get<number>("LIVEKIT_TOKEN_TTL_SECONDS", 300);
    const token = new AccessToken(
      this.livekitKey,
      this.livekitSecret,
      {
        identity: user.id,
        name: user.username,
        ttl,
        metadata: JSON.stringify({ channelId: channel.id })
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false
    });

    return {
      token: await token.toJwt(),
      url: this.livekitUrl,
      channel: {
        id: channel.id,
        name: channel.name
      },
      expiresIn: ttl
    };
  }

  async disconnectUser(userId: string): Promise<void> {
    if (!this.rooms) return;

    const rooms = await this.rooms.listRooms();
    const revokeTokenTs = BigInt(Math.floor(Date.now() / 1000) + 1);

    await Promise.allSettled(
      rooms
        .filter((room) => room.name.startsWith("voice:"))
        .map((room) =>
          this.rooms!.removeParticipant(room.name, userId, { revokeTokenTs })
        )
    );
  }
}
