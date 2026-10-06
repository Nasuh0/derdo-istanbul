import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.getOrThrow<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: config.getOrThrow<string>("CLOUDINARY_API_KEY"),
      api_secret: config.getOrThrow<string>("CLOUDINARY_API_SECRET"),
      secure: true
    });
  }

  uploadImage(buffer: Buffer): Promise<UploadApiResponse> {
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
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true
    });
  }
}
