import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { sanitizeBody } from '../utils/sanitize.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - start;

          this.logger.log('info', `[${method}] ${url} - status: ${res.statusCode} - ${duration}ms`, {
            body: sanitizeBody(body),
            query,
            params,
            response,
          });
        },
        error: (err) => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - start;

          this.logger.log('error', `[${method}] ${url} - status: ${res.statusCode} - ${duration}ms`, {
            body: sanitizeBody(body),
            query,
            params,
            error: {
              message: err.message,
              stack: err.stack,
            },
          });
        },
      }),
    );
  }
}
