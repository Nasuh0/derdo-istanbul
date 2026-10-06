import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { VoiceModule } from "../voice/voice.module";
import { AdminController } from "./admin.controller";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";

@Module({
  imports: [RealtimeModule, VoiceModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard]
})
export class AdminModule {}
