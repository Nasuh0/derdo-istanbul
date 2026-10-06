import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CloudinaryService } from "./cloudinary.service";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [CloudinaryService, UploadsService],
  exports: [UploadsService]
})
export class UploadsModule {}
