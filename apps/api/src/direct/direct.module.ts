import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DirectController } from "./direct.controller";
import { DirectService } from "./direct.service";

@Module({
  imports: [AuthModule],
  controllers: [DirectController],
  providers: [DirectService],
  exports: [DirectService]
})
export class DirectModule {}
