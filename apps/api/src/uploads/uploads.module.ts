import { Module } from "@nestjs/common";
import { CloudinaryService } from "./cloudinary.service";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";

@Module({
  controllers: [UploadsController],
  providers: [CloudinaryService, UploadsService],
  exports: [UploadsService]
})
export class UploadsModule {}
