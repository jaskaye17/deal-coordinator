import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LLMService } from './llm.service';
import { FAKE_LLM_PROVIDER } from './llm-provider.interface';
import { FakeLLMProvider } from './providers/fake-llm.provider';

const fakeLlmProvider = {
  provide: FAKE_LLM_PROVIDER,
  useClass: FakeLLMProvider,
};

@Module({
  imports: [PrismaModule],
  providers: [fakeLlmProvider, LLMService],
  exports: [LLMService, FAKE_LLM_PROVIDER],
})
export class LLMModule {}
