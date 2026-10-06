import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { UserRole } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateRoomDto } from "./dto/create-room.dto";

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.chatRoom.findMany({
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
        type: true,
        createdById: true,
        createdAt: true
      }
    });
  }

  async create(user: { id: string; role: UserRole }, dto: CreateRoomDto) {
    const type = dto.type ?? "PRIVATE";
    if (type === "PUBLIC" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can create public rooms");
    }

    return this.prisma.chatRoom.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim().toLowerCase(),
        type,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER"
          }
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        createdAt: true
      }
    });
  }

  async invite(actor: { id: string; role: UserRole }, roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, type: true, createdById: true }
    });

    if (!room) throw new NotFoundException("Room not found");
    if (room.type !== "PRIVATE") {
      throw new ForbiddenException("Public rooms do not need invitations");
    }
    if (room.createdById !== actor.id && actor.role !== "ADMIN") {
      throw new ForbiddenException("Only the room owner can invite members");
    }

    await this.prisma.chatRoomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, role: "MEMBER" },
      update: {}
    });

    return { ok: true };
  }

  async assertAccess(userId: string, roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        members: {
          where: { userId },
          select: { userId: true }
        }
      }
    });

    if (!room) throw new NotFoundException("Room not found");
    if (room.type === "PRIVATE" && room.members.length === 0) {
      throw new ForbiddenException("You do not have access to this room");
    }

    return room;
  }

  async listMessages(userId: string, roomId: string, take = 50) {
    await this.assertAccess(userId, roomId);
    const limit = Math.min(Math.max(take, 1), 100);

    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: {
          select: { id: true, username: true }
        },
        attachments: true
      }
    });

    return messages.reverse();
  }

  async createMessage(
    userId: string,
    roomId: string,
    content: string,
    attachmentIds: string[] = []
  ) {
    await this.assertAccess(userId, roomId);

    const value = content.trim();
    const ids = Array.from(new Set(attachmentIds.filter(Boolean))).slice(0, 10);
    if ((!value && ids.length === 0) || value.length > 4000) {
      throw new Error("Message must contain text or an attachment and stay under 4000 characters");
    }

    return this.prisma.$transaction(async (tx) => {
      if (ids.length > 0) {
        const attachments = await tx.attachment.findMany({
          where: {
            id: { in: ids },
            uploaderId: userId,
            chatMessageId: null,
            directMessageId: null
          },
          select: { id: true }
        });

        if (attachments.length !== ids.length) {
          throw new ForbiddenException("One or more attachments are invalid or already used");
        }
      }

      const message = await tx.chatMessage.create({
        data: {
          roomId,
          authorId: userId,
          content: value
        },
        select: { id: true }
      });

      if (ids.length > 0) {
        const claimed = await tx.attachment.updateMany({
          where: {
            id: { in: ids },
            uploaderId: userId,
            chatMessageId: null,
            directMessageId: null
          },
          data: { chatMessageId: message.id }
        });

        if (claimed.count !== ids.length) {
          throw new ForbiddenException("An attachment was claimed concurrently");
        }
      }

      return tx.chatMessage.findUniqueOrThrow({
        where: { id: message.id },
        include: {
          author: {
            select: { id: true, username: true }
          },
          attachments: true
        }
      });
    });
  }
}
