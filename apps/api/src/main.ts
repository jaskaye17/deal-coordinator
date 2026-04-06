import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as {
    get: (path: string, handler: (req: Request, res: Response) => void) => void;
  };
  expressApp.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'api' });
  });
  app.enableCors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'x-user-id',
      'x-workspace-id',
      'x-request-id',
    ],
  });
  app.setGlobalPrefix('api');
  const port = parseInt(process.env.PORT || process.env.API_PORT || '3001', 10);
  await app.listen(port);
}
bootstrap();
