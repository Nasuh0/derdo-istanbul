import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AdminRoomDto } from "./dto/admin-room.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        username: true,
        role: true,
        isBanned: true,
        createdAt: true,
        lastLoginAt: true
      }
    });
  }

  async setBan(actorId: string, targetId: string, banned: boolean) {
    if (actorId === targetId && banned) {
      throw new BadRequestException("You cannot ban your own account");
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, username: true }
    });
    if (!existing) throw new NotFoundException("User not found");

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetId },
        data: banned
          ? {
              isBanned: true,
              refreshTokenHash: null,
              tokenVersion: { increment: 1 }
            }
          : { isBanned: false },
        select: {
          id: true,
          username: true,
          role: true,
          isBanned: true
        }
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: banned ? "USER_BANNED" : "USER_UNBANNED",
          targetType: "USER",
          targetId,
          metadata: { username: existing.username }
        }
      });

      return user;
    });

    return updated;
  }

  listRooms() {
    return this.prisma.chatRoom.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        createdAt: true
      }
    });
  }

  async createRoom(actorId: string, dto: AdminRoomDto) {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.chatRoom.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          type: dto.type,
          createdById: actorId
        },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          createdAt: true
        }
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "ROOM_CREATED",
          targetType: "CHAT_ROOM",
          targetId: room.id,
          metadata: { name: room.name, type: room.type }
        }
      });

      return room;
    });
  }

  async deleteRoom(actorId: string, roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, name: true, slug: true }
    });
    if (!room) throw new NotFoundException("Room not found");
    if (room.slug === "genel") {
      throw new BadRequestException("The general room cannot be deleted");
    }

    await this.prisma.$transaction([
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: "ROOM_DELETED",
          targetType: "CHAT_ROOM",
          targetId: room.id,
          metadata: { name: room.name, slug: room.slug }
        }
      }),
      this.prisma.chatRoom.delete({ where: { id: roomId } })
    ]);

    return { ok: true };
  }

  listAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        actor: {
          select: { id: true, username: true }
        }
      }
    });
  }
}
