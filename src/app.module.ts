import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { GatewayController } from './controllers/gateway.controller';
import { AuthMiddleware } from './common/auth.middleware';
import { AuthorizeMiddleware } from './common/authorize.middleware';
import { GatewayForwardService } from './common/gateway-forward.service';
import { RedisService } from './services/redis.service';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/logger.config';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,    // ⏱️ 1 minute
          limit: 100, // 🚦 100 req / IP
        },
      ]
    }),
    WinstonModule.forRoot(winstonConfig),
  ],
  controllers: [GatewayController],
  providers: [
    RedisService,
    GatewayForwardService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Global rate limit
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware, AuthorizeMiddleware)
      .exclude({ path: '/health', method: RequestMethod.ALL })
      .forRoutes('*');
  }
}
