import { Module, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { GatewayController } from './controllers/gateway.controller';
import { AuthMiddleware } from './common/auth.middleware';
import { RedisService } from './services/redis.service';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,      // 1 minute
      limit: 100,   // 100 req / IP
    }),
  ],
  controllers: [GatewayController],
  providers: [
    RedisService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Global rate limit
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('*'); // Auth middleware before controllers
  }
}
