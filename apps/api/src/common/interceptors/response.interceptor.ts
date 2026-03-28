import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((result) => {
        if (result instanceof StreamableFile) {
          return result;
        }
        if (result && typeof result === 'object' && 'items' in result && 'meta' in result) {
          return { data: result.items, meta: result.meta };
        }
        return { data: result };
      }),
    );
  }
}
