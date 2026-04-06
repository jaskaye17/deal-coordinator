import { Injectable, StreamableFile } from '@nestjs/common';
import type { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
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
