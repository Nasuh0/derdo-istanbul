import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";
import { AdminRoomDto } from "./dto/admin-room.dto";
import { BanUserDto } from "./dto/ban-user.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly realtime: RealtimeGateway
  ) {}

  @Get("users")
  users() {
    return this.admin.listUsers();
  }

  @Patch("users/:userId/ban")
  async ban(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: BanUserDto
  ) {
    const user = await this.admin.setBan(actor.id, userId, dto.banned);
    if (dto.banned) {
      await this.realtime.disconnectUser(userId);
    }
    return user;
  }

  @Get("rooms")
  rooms() {
    return this.admin.listRooms();
  }

  @Post("rooms")
  createRoom(@CurrentUser() actor: AuthenticatedUser, @Body() dto: AdminRoomDto) {
    return this.admin.createRoom(actor.id, dto);
  }

  @Delete("rooms/:roomId")
  deleteRoom(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("roomId") roomId: string
  ) {
    return this.admin.deleteRoom(actor.id, roomId);
  }

  @Get("audit-logs")
  auditLogs() {
    return this.admin.listAuditLogs();
  }
}
