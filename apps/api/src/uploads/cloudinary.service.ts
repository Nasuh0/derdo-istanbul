import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

@Injectable()
export class CloudinaryService {
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>("CLOUDINARY_CLOUD_NAME", "").trim();
    const apiKey = config.get<string>("CLOUDINARY_API_KEY", "").trim();
    const apiSecret = config.get<string>("CLOUDINARY_API_SECRET", "").trim();

    this.enabled = Boolean(cloudName && apiKey && apiSecret);

    if (this.enabled) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
    }
  }

  uploadImage(buffer: Buffer): Promise<UploadApiResponse> {
    if (!this.enabled) {
      throw new ServiceUnavailableException("Cloudinary is not configured");
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "derdo/chat",
          unique_filename: true,
          overwrite: false,
          allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"]
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error("Cloudinary did not return an upload result"));
          resolve(result);
        }
      );
      stream.end(buffer);
    });
  }

  async destroy(publicId: string): Promise<void> {
    if (!this.enabled) return;
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true
    });
  }
}
