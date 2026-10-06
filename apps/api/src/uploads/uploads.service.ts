import { BadRequestException, Injectable } from "@nestjs/common";
import { basename } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "./cloudinary.service";

function detectImageMime(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return "image/jpeg";

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  ) return "image/png";

  if (buffer.length >= 6) {
    const gif = buffer.subarray(0, 6).toString("ascii");
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) return "image/webp";

  return null;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService
  ) {}

  async uploadImage(userId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Image file is required");
    }

    const mimeType = detectImageMime(file.buffer);
    if (!mimeType) {
      throw new BadRequestException("Only JPEG, PNG, GIF and WebP images are allowed");
    }

    const cleanName = basename(file.originalname || "image")
      .replace(/[^A-Za-z0-9._ -]/g, "_")
      .slice(0, 255);

    const uploaded = await this.cloudinary.uploadImage(file.buffer);

    try {
      return await this.prisma.attachment.create({
        data: {
          uploaderId: userId,
          publicId: uploaded.public_id,
          url: uploaded.secure_url,
          mimeType,
          sizeBytes: file.size,
          originalName: cleanName || "image",
          width: uploaded.width,
          height: uploaded.height
        },
        select: {
          id: true,
          url: true,
          mimeType: true,
          sizeBytes: true,
          originalName: true,
          width: true,
          height: true,
          createdAt: true
        }
      });
    } catch (error) {
      await this.cloudinary.destroy(uploaded.public_id).catch(() => undefined);
      throw error;
    }
  }
}
