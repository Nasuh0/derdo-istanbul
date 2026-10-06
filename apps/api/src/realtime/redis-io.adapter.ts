import { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server, ServerOptions } from "socket.io";
import { RedisService } from "../redis/redis.service";

export class RedisIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly redis: RedisService,
    private readonly config: ConfigService
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const origins = this.config
      .get<string>("CORS_ORIGINS", "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    const mergedOptions = {
      ...(options ?? {}),
      cors: {
        origin: origins,
        credentials: true,
        methods: ["GET", "POST"]
      }
    } as ServerOptions;

    const server = super.createIOServer(port, mergedOptions);
    server.adapter(createAdapter(this.redis.pubClient, this.redis.subClient));
    return server;
  }
}
