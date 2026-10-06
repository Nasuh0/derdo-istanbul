import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DirectModule } from "../direct/direct.module";
import { RoomsModule } from "../rooms/rooms.module";
import { RealtimeGateway } from "./realtime.gateway";

@Module({
  imports: [AuthModule, RoomsModule, DirectModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway]
})
export class RealtimeModule {}
