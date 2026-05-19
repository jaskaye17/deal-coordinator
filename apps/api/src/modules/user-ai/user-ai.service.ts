import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OPENAI_USER_CONNECTION_PROVIDER,
  SIMULATOR_AGENT_CONNECTION_PROVIDER,
} from './openai-provider.constant';

@Injectable()
export class UserAiService {
  constructor(private readonly prisma: PrismaService) {}

  async getOpenAIStatus(userId: string): Promise<{ configured: boolean; model: string | null }> {
    const conn = await this.prisma.userConnection.findUnique({
      where: {
        userId_provider: { userId, provider: OPENAI_USER_CONNECTION_PROVIDER },
      },
    });
    const meta = (conn?.metadata as { model?: string } | null) ?? {};
    return {
      configured: Boolean(conn?.accessToken?.trim()),
      model: meta.model ?? null,
    };
  }

  async saveOpenAIKey(userId: string, apiKey: string, model?: string): Promise<void> {
    const trimmed = apiKey.trim();
    const existing = await this.prisma.userConnection.findUnique({
      where: {
        userId_provider: { userId, provider: OPENAI_USER_CONNECTION_PROVIDER },
      },
    });
    const prevMeta = (existing?.metadata as Record<string, unknown> | null) ?? {};
    const metadata = {
      ...prevMeta,
      ...(model != null && model !== '' ? { model } : {}),
    };

    await this.prisma.userConnection.upsert({
      where: {
        userId_provider: { userId, provider: OPENAI_USER_CONNECTION_PROVIDER },
      },
      create: {
        userId,
        provider: OPENAI_USER_CONNECTION_PROVIDER,
        accessToken: trimmed,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      },
      update: {
        accessToken: trimmed,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      },
    });
  }

  async clearOpenAI(userId: string): Promise<void> {
    await this.prisma.userConnection.deleteMany({
      where: { userId, provider: OPENAI_USER_CONNECTION_PROVIDER },
    });
  }

  async getSimulatorAgentFrom(userId: string): Promise<{ agentFromE164: string | null }> {
    const conn = await this.prisma.userConnection.findUnique({
      where: {
        userId_provider: { userId, provider: SIMULATOR_AGENT_CONNECTION_PROVIDER },
      },
    });
    const m = (conn?.metadata as { fromE164?: string } | null) ?? {};
    const v = m.fromE164?.trim();
    return { agentFromE164: v || null };
  }

  async saveSimulatorAgentFrom(userId: string, fromE164: string | null): Promise<void> {
    const trimmed = fromE164?.trim() ?? '';
    if (!trimmed) {
      await this.prisma.userConnection.deleteMany({
        where: { userId, provider: SIMULATOR_AGENT_CONNECTION_PROVIDER },
      });
      return;
    }
    await this.prisma.userConnection.upsert({
      where: {
        userId_provider: { userId, provider: SIMULATOR_AGENT_CONNECTION_PROVIDER },
      },
      create: {
        userId,
        provider: SIMULATOR_AGENT_CONNECTION_PROVIDER,
        metadata: { fromE164: trimmed },
      },
      update: { metadata: { fromE164: trimmed } },
    });
  }
}
