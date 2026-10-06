import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { VoiceService } from "./voice.service";

@Controller("voice")
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Get("channels")
  channels(@CurrentUser() user: AuthenticatedUser) {
    return this.voice.listForUser(user.id);
  }

  @Post("channels/:channelId/token")
  token(
    @CurrentUser() user: AuthenticatedUser,
    @Param("channelId") channelId: string
  ) {
    return this.voice.issueJoinToken(user, channelId);
  }
}
