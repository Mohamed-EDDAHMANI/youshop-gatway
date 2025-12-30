import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
