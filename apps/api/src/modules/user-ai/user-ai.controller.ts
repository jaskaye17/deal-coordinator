import { Controller, Get, Put, Patch, Delete, Post, Body } from '@nestjs/common';
import { z } from 'zod';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthService } from '../auth/auth.service';
import type { UserAiService } from './user-ai.service';

const putOpenAISchema = z.object({
  apiKey: z.string().min(8, 'API key looks too short'),
  model: z.string().optional(),
});

const putSimulatorSchema = z.object({
  agentFromE164: z.string().trim().min(4).max(32),
});

/** JSON often sends `null` for cleared fields; Zod `.optional()` rejects null. */
function stripNullFields(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = { ...(raw as Record<string, unknown>) };
  for (const k of Object.keys(o)) {
    if (o[k] === null) delete o[k];
  }
  return o;
}

const patchProfileSchema = z.preprocess(
  (raw) => stripNullFields(raw),
  z.object({
    name: z.string().min(1).optional(),
    company: z.string().optional(),
    market: z.string().optional(),
    phone: z.string().optional(),
    licenseNumber: z.string().optional(),
    brokerLicenseNumber: z.string().optional(),
    brokerAddress: z.string().optional(),
    brokerCity: z.string().optional(),
    brokerState: z.string().optional(),
    brokerZip: z.string().optional(),
    brokerPhone: z.string().optional(),
    brokerEmail: z.string().optional(),
    responsibleBrokerId: z.string().optional(),
    agentAddress: z.string().optional(),
    agentCity: z.string().optional(),
    agentState: z.string().optional(),
    agentZip: z.string().optional(),
  }),
);

const createResponsibleBrokerSchema = z.preprocess(
  (raw) => stripNullFields(raw),
  z.object({
    name: z.string().min(1),
    licenseNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().optional(),
    email: z.union([z.string().email(), z.literal('')]).optional(),
  }),
);

@Controller('users/me')
export class UserAiController {
  constructor(
    private readonly userAi: UserAiService,
    private readonly auth: AuthService,
  ) {}

  @Get('profile')
  async getProfile(@Tenant() tenant: TenantContext) {
    return this.auth.getUserProfile(tenant.userId, tenant.workspaceId);
  }

  @Patch('profile')
  async patchProfile(
    @Tenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(patchProfileSchema)) body: z.infer<typeof patchProfileSchema>,
  ) {
    return this.auth.patchUserProfile(tenant.userId, tenant.workspaceId, body);
  }

  @Post('responsible-brokers')
  async createResponsibleBroker(
    @Tenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createResponsibleBrokerSchema)) body: z.infer<typeof createResponsibleBrokerSchema>,
  ) {
    return this.auth.createResponsibleBroker(tenant.userId, tenant.workspaceId, body);
  }

  @Get('openai')
  async getOpenAI(@Tenant() tenant: TenantContext): Promise<any> {
    return this.userAi.getOpenAIStatus(tenant.userId);
  }

  @Put('openai')
  async putOpenAI(
    @Tenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(putOpenAISchema)) body: z.infer<typeof putOpenAISchema>,
  ): Promise<any> {
    await this.userAi.saveOpenAIKey(tenant.userId, body.apiKey, body.model);
    return { success: true };
  }

  @Delete('openai')
  async deleteOpenAI(@Tenant() tenant: TenantContext): Promise<any> {
    await this.userAi.clearOpenAI(tenant.userId);
    return { success: true };
  }

  @Get('simulator')
  async getSimulator(@Tenant() tenant: TenantContext): Promise<any> {
    return this.userAi.getSimulatorAgentFrom(tenant.userId);
  }

  @Put('simulator')
  async putSimulator(
    @Tenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(putSimulatorSchema)) body: z.infer<typeof putSimulatorSchema>,
  ): Promise<any> {
    await this.userAi.saveSimulatorAgentFrom(tenant.userId, body.agentFromE164);
    return { success: true };
  }

  @Delete('simulator')
  async deleteSimulator(@Tenant() tenant: TenantContext): Promise<any> {
    await this.userAi.saveSimulatorAgentFrom(tenant.userId, null);
    return { success: true };
  }
}
