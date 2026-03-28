import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  await app.listen(process.env.API_PORT || 3001);
}
bootstrap();
