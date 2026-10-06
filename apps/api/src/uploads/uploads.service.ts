import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
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

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/gif": return "gif";
    case "image/webp": return "webp";
    default: return "bin";
  }
}

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    config: ConfigService
  ) {
    this.uploadDir = config.get<string>("UPLOAD_DIR", "/data/uploads");
  }

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

    let provider = "filesystem";
    let publicId = "";
    let url = "";
    let width: number | null = null;
    let height: number | null = null;
    let localPath: string | null = null;

    if (this.cloudinary.enabled) {
      const uploaded = await this.cloudinary.uploadImage(file.buffer);
      provider = "cloudinary";
      publicId = uploaded.public_id;
      url = uploaded.secure_url;
      width = uploaded.width ?? null;
      height = uploaded.height ?? null;
    } else {
      await mkdir(this.uploadDir, { recursive: true });
      const filename = `${randomUUID()}.${extensionForMime(mimeType)}`;
      localPath = join(this.uploadDir, filename);
      await writeFile(localPath, file.buffer, { flag: "wx" });
      publicId = `filesystem:${filename}`;
      url = `/media/${filename}`;
    }

    try {
      return await this.prisma.attachment.create({
        data: {
          uploaderId: userId,
          provider,
          publicId,
          url,
          mimeType,
          sizeBytes: file.size,
          originalName: cleanName || "image",
          width,
          height
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
      if (provider === "cloudinary") {
        await this.cloudinary.destroy(publicId).catch(() => undefined);
      } else if (localPath) {
        await unlink(localPath).catch(() => undefined);
      }
      throw error;
    }
  }
}
