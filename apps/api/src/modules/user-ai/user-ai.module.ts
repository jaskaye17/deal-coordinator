import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UserAiController } from './user-ai.controller';
import { UserAiService } from './user-ai.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UserAiController],
  providers: [UserAiService],
  exports: [UserAiService],
})
export class UserAiModule {}
