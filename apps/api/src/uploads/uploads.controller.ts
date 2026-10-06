import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UploadsService } from "./uploads.service";

@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly config: ConfigService
  ) {}

  @Post("images")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        files: 1,
        fileSize: 8 * 1024 * 1024
      }
    })
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File
  ) {
    const max = this.config.get<number>("MAX_IMAGE_UPLOAD_BYTES", 8 * 1024 * 1024);
    if (file?.size > max) {
      throw new Error("Image is too large");
    }
    return this.uploads.uploadImage(user.id, file);
  }
}
