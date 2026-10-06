import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CreateRoomDto } from "./dto/create-room.dto";
import { InviteRoomDto } from "./dto/invite-room.dto";
import { RoomsService } from "./rooms.service";

@Controller("rooms")
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.rooms.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoomDto) {
    return this.rooms.create(user, dto);
  }

  @Post(":roomId/invite")
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param("roomId") roomId: string,
    @Body() dto: InviteRoomDto
  ) {
    return this.rooms.invite(user, roomId, dto.userId);
  }

  @Get(":roomId/messages")
  messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("roomId") roomId: string,
    @Query("take", new ParseIntPipe({ optional: true })) take?: number
  ) {
    return this.rooms.listMessages(user.id, roomId, take ?? 50);
  }
}
