import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccessToken } from "livekit-server-sdk";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async listForUser(userId: string) {
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
      this.config.getOrThrow<string>("LIVEKIT_API_KEY"),
      this.config.getOrThrow<string>("LIVEKIT_API_SECRET"),
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
      url: this.config.getOrThrow<string>("LIVEKIT_URL"),
      channel: {
        id: channel.id,
        name: channel.name
      },
      expiresIn: ttl
    };
  }
}
