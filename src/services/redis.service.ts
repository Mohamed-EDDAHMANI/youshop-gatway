import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;

  onModuleInit() {
    const options: RedisOptions = {
      host: process.env.REDIS_HOST || 'redis', // docker service name
      port: Number(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times) => {
        this.logger.warn(`Redis reconnect attempt #${times}`);
        return Math.min(times * 100, 2000);
      },
    };

    this.redis = new Redis(options);

    this.redis.on('connect', () => {
      this.logger.log('Redis connected ✅');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis error ❌', err);
    });
  }

  onModuleDestroy() {
    this.redis?.disconnect();
    this.logger.log('Redis disconnected 🔌');
  }

  getClient(): Redis {
    return this.redis;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }
}
