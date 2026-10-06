import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type RedisClientType } from "redis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly pubClient: RedisClientType;
  readonly subClient: RedisClientType;
  private connected = false;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>("REDIS_URL");
    this.pubClient = createClient({ url });
    this.subClient = this.pubClient.duplicate();
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
    this.connected = true;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.connected) return;
    await Promise.allSettled([this.pubClient.quit(), this.subClient.quit()]);
  }
}
