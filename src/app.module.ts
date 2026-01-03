import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { GatewayController } from './controllers/gateway.controller';
import { AuthMiddleware } from './common/auth.middleware';
import { AuthorizeMiddleware } from './common/authorize.middleware';
import { GatewayForwardService } from './common/gateway-forward.service';
import { ErrorHandlerService } from './common/error-handler.service';
import { RedisService } from './services/redis.service';
import { WinstonModule } from 'nest-winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { winstonConfig } from './common/logger/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const expiresIn = configService.get<string>('ACCESS_TOKEN_EXPIRES', '7d');
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
      global: true, // Makes JwtService available globally
    }),
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
    ErrorHandlerService,
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
