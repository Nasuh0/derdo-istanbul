import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DirectService {
  constructor(private readonly prisma: PrismaService) {}

  async open(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException("You cannot start a DM with yourself");
    }

    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, username: true, isBanned: true }
    });
    if (!other || other.isBanned) {
      throw new NotFoundException("User not found");
    }

    const pairKey = [userId, otherUserId].sort().join(":");

    return this.prisma.directConversation.upsert({
      where: { pairKey },
      create: {
        pairKey,
        members: {
          create: [{ userId }, { userId: otherUserId }]
        }
      },
      update: {},
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true } }
          }
        }
      }
    });
  }

  async list(userId: string) {
    return this.prisma.directConversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true } }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            author: { select: { id: true, username: true } }
          }
        }
      }
    });
  }

  async assertMember(userId: string, conversationId: string) {
    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        members: { some: { userId } }
      },
      include: {
        members: {
          select: { userId: true }
        }
      }
    });
    if (!conversation) throw new ForbiddenException("DM access denied");
    return conversation;
  }

  async listMessages(userId: string, conversationId: string, take = 50) {
    await this.assertMember(userId, conversationId);
    const messages = await this.prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(take, 1), 100),
      include: {
        author: { select: { id: true, username: true } }
      }
    });
    return messages.reverse();
  }

  async createMessage(userId: string, conversationId: string, content: string) {
    const conversation = await this.assertMember(userId, conversationId);
    const value = content.trim();
    if (!value || value.length > 4000) {
      throw new Error("Message must be between 1 and 4000 characters");
    }

    const message = await this.prisma.directMessage.create({
      data: {
        conversationId,
        authorId: userId,
        content: value
      },
      include: {
        author: { select: { id: true, username: true } }
      }
    });

    await this.prisma.directConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return {
      message,
      memberIds: conversation.members.map((member) => member.userId)
    };
  }
}
