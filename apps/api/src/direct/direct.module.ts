import { Module } from "@nestjs/common";
import { DirectController } from "./direct.controller";
import { DirectService } from "./direct.service";

@Module({
  controllers: [DirectController],
  providers: [DirectService],
  exports: [DirectService]
})
export class DirectModule {}
