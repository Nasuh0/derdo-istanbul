import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { DirectService } from "./direct.service";

@Controller("dm")
@UseGuards(JwtAuthGuard)
export class DirectController {
  constructor(private readonly direct: DirectService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.direct.list(user.id);
  }

  @Post("with/:userId")
  open(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string) {
    return this.direct.open(user.id, userId);
  }

  @Get(":conversationId/messages")
  messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Query("take", new ParseIntPipe({ optional: true })) take?: number
  ) {
    return this.direct.listMessages(user.id, conversationId, take ?? 50);
  }
}
