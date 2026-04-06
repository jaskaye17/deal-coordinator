import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@deal-coordinator/db';
import type { PrismaService } from '../../prisma/prisma.service';

const SALT_ROUNDS = 10;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

type AgentProfileMeta = {
  phone?: string;
  licenseNumber?: string;
  company?: string;
  market?: string;
  brokerLicenseNumber?: string;
  brokerAddress?: string;
  brokerCity?: string;
  brokerState?: string;
  brokerZip?: string;
  brokerPhone?: string;
  brokerEmail?: string;
  responsibleBrokerId?: string;
  agentAddress?: string;
  agentCity?: string;
  agentState?: string;
  agentZip?: string;
};

const AGENT_PROFILE_META_KEYS = [
  'phone',
  'licenseNumber',
  'company',
  'market',
  'brokerLicenseNumber',
  'brokerAddress',
  'brokerCity',
  'brokerState',
  'brokerZip',
  'brokerPhone',
  'brokerEmail',
  'responsibleBrokerId',
  'agentAddress',
  'agentCity',
  'agentState',
  'agentZip',
] as const satisfies readonly (keyof AgentProfileMeta)[];

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Migrations not applied or DB out of sync — avoid 500 on profile reads. */
  private isResponsibleBrokerUnavailable(e: unknown): boolean {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (e.code === 'P2021') return true;
    const msg = e.message ?? '';
    return /ResponsibleBroker/i.test(msg) && /does not exist/i.test(msg);
  }

  private async listResponsibleBrokers(workspaceId: string) {
    try {
      return await this.prisma.responsibleBroker.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          licenseNumber: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          phone: true,
          email: true,
        },
      });
    } catch (e) {
      if (this.isResponsibleBrokerUnavailable(e)) return [];
      throw e;
    }
  }

  private parseAgentProfileContent(content: string | null | undefined): Record<string, string> {
    if (!content) return {};
    try {
      const p = JSON.parse(content) as unknown;
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        return Object.fromEntries(
          Object.entries(p as Record<string, unknown>).filter(
            ([, v]) => typeof v === 'string',
          ) as [string, string][],
        );
      }
    } catch {
      /* ignore */
    }
    return {};
  }

  private async mergeAgentProfileMemory(
    userId: string,
    workspaceId: string,
    partial: Partial<AgentProfileMeta>,
  ): Promise<void> {
    const existing = await this.prisma.memoryEntry.findFirst({
      where: {
        workspaceId,
        scope: 'workspace',
        category: 'agent_profile',
        createdBy: userId,
      },
    });
    const meta = this.parseAgentProfileContent(existing?.content as string | undefined);
    for (const key of AGENT_PROFILE_META_KEYS) {
      if (partial[key] !== undefined) {
        meta[key] = partial[key]!;
      }
    }
    const content = JSON.stringify(meta);
    if (existing) {
      await this.prisma.memoryEntry.update({
        where: { id: existing.id },
        data: { content },
      });
    } else {
      await this.prisma.memoryEntry.create({
        data: {
          workspaceId,
          scope: 'workspace',
          category: 'agent_profile',
          content,
          createdBy: userId,
        },
      });
    }
  }

  async register(data: { email: string; name: string; password: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const workspaceName = `${data.name}'s Workspace`;
    let slug = slugify(workspaceName);

    const slugConflict = await this.prisma.workspace.findUnique({ where: { slug } });
    if (slugConflict) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, name: data.name, passwordHash },
        select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
      });

      const workspace = await tx.workspace.create({
        data: { name: workspaceName, slug },
      });

      await tx.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: user.id, role: 'admin' },
      });

      await tx.workspaceSettings.create({
        data: { workspaceId: workspace.id },
      });

      return {
        user,
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, role: 'admin' as const },
      };
    });

    return {
      user: result.user,
      workspaces: [result.workspace],
      isNewUser: true,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { workspace: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.passwordHash) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new UnauthorizedException('Invalid email or password');
      }
    } else {
      if (password !== 'demo') {
        throw new UnauthorizedException('Invalid email or password');
      }
    }

    const workspaces = user.memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      workspaces,
      isNewUser: false,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { workspace: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const workspaces = user.memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      workspaces,
    };
  }

  async updateOnboarding(
    userId: string,
    workspaceId: string,
    data: {
      workspaceName?: string;
      phone?: string;
      licenseNumber?: string;
      company?: string;
      market?: string;
    },
  ) {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Workspace membership not found');
    }

    const updates: Promise<unknown>[] = [];

    if (data.workspaceName) {
      let slug = slugify(data.workspaceName);
      const conflict = await this.prisma.workspace.findUnique({ where: { slug } });
      if (conflict && conflict.id !== workspaceId) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      updates.push(
        this.prisma.workspace.update({
          where: { id: workspaceId },
          data: { name: data.workspaceName, slug },
        }),
      );
    }

    const profilePartial: Partial<AgentProfileMeta> = {};
    if (data.phone) profilePartial.phone = data.phone;
    if (data.licenseNumber) profilePartial.licenseNumber = data.licenseNumber;
    if (data.company) profilePartial.company = data.company;
    if (data.market) profilePartial.market = data.market;
    if (Object.keys(profilePartial).length > 0) {
      updates.push(this.mergeAgentProfileMemory(userId, workspaceId, profilePartial));
    }

    await Promise.all(updates);

    return { success: true };
  }

  async getUserProfile(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Workspace membership not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const entry = await this.prisma.memoryEntry.findFirst({
      where: {
        workspaceId,
        scope: 'workspace',
        category: 'agent_profile',
        createdBy: userId,
      },
    });
    const meta = this.parseAgentProfileContent(entry?.content as string | undefined);

    const responsibleBrokers = await this.listResponsibleBrokers(workspaceId);

    return {
      user,
      broker: {
        company: meta.company ?? '',
        market: meta.market ?? '',
        licenseNumber: meta.brokerLicenseNumber ?? '',
        address: meta.brokerAddress ?? '',
        city: meta.brokerCity ?? '',
        state: meta.brokerState ?? '',
        zip: meta.brokerZip ?? '',
        phone: meta.brokerPhone ?? '',
        email: meta.brokerEmail ?? '',
        responsibleBrokerId: meta.responsibleBrokerId ?? '',
      },
      agent: {
        phone: meta.phone ?? '',
        licenseNumber: meta.licenseNumber ?? '',
        address: meta.agentAddress ?? '',
        city: meta.agentCity ?? '',
        state: meta.agentState ?? '',
        zip: meta.agentZip ?? '',
      },
      responsibleBrokers,
    };
  }

  async createResponsibleBroker(
    userId: string,
    workspaceId: string,
    data: {
      name: string;
      licenseNumber?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      phone?: string;
      email?: string;
    },
  ) {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Workspace membership not found');
    }

    const trimOrNull = (s: string | undefined) => {
      if (s === undefined) return null;
      const t = s.trim();
      return t === '' ? null : t;
    };

    try {
      return await this.prisma.responsibleBroker.create({
        data: {
          workspaceId,
          name: data.name.trim(),
          licenseNumber: trimOrNull(data.licenseNumber),
          address: trimOrNull(data.address),
          city: trimOrNull(data.city),
          state: trimOrNull(data.state),
          zip: trimOrNull(data.zip),
          phone: trimOrNull(data.phone),
          email: trimOrNull(data.email),
        },
        select: {
          id: true,
          name: true,
          licenseNumber: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          phone: true,
          email: true,
        },
      });
    } catch (e) {
      if (this.isResponsibleBrokerUnavailable(e)) {
        throw new BadRequestException(
          'Responsible broker storage is not available. Apply database migrations for this workspace (ResponsibleBroker table).',
        );
      }
      throw e;
    }
  }

  async patchUserProfile(
    userId: string,
    workspaceId: string,
    data: {
      name?: string;
      company?: string;
      market?: string;
      phone?: string;
      licenseNumber?: string;
      brokerLicenseNumber?: string;
      brokerAddress?: string;
      brokerCity?: string;
      brokerState?: string;
      brokerZip?: string;
      brokerPhone?: string;
      brokerEmail?: string;
      responsibleBrokerId?: string;
      agentAddress?: string;
      agentCity?: string;
      agentState?: string;
      agentZip?: string;
    },
  ) {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Workspace membership not found');
    }

    const updates: Promise<unknown>[] = [];

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Name cannot be empty');
      }
      updates.push(
        this.prisma.user.update({
          where: { id: userId },
          data: { name: trimmed },
        }),
      );
    }

    const profilePartial: Partial<AgentProfileMeta> = {};
    if (data.company !== undefined) profilePartial.company = data.company;
    if (data.market !== undefined) profilePartial.market = data.market;
    if (data.phone !== undefined) profilePartial.phone = data.phone;
    if (data.licenseNumber !== undefined) profilePartial.licenseNumber = data.licenseNumber;
    if (data.brokerLicenseNumber !== undefined) profilePartial.brokerLicenseNumber = data.brokerLicenseNumber;
    if (data.brokerAddress !== undefined) profilePartial.brokerAddress = data.brokerAddress;
    if (data.brokerCity !== undefined) profilePartial.brokerCity = data.brokerCity;
    if (data.brokerState !== undefined) profilePartial.brokerState = data.brokerState;
    if (data.brokerZip !== undefined) profilePartial.brokerZip = data.brokerZip;
    if (data.brokerPhone !== undefined) profilePartial.brokerPhone = data.brokerPhone;
    if (data.brokerEmail !== undefined) profilePartial.brokerEmail = data.brokerEmail;
    if (data.agentAddress !== undefined) profilePartial.agentAddress = data.agentAddress;
    if (data.agentCity !== undefined) profilePartial.agentCity = data.agentCity;
    if (data.agentState !== undefined) profilePartial.agentState = data.agentState;
    if (data.agentZip !== undefined) profilePartial.agentZip = data.agentZip;

    if (data.responsibleBrokerId !== undefined) {
      const raw = data.responsibleBrokerId.trim();
      if (raw === '') {
        profilePartial.responsibleBrokerId = '';
      } else {
        try {
          const rb = await this.prisma.responsibleBroker.findFirst({
            where: { id: raw, workspaceId },
          });
          if (!rb) {
            throw new BadRequestException('Responsible broker not found');
          }
          profilePartial.responsibleBrokerId = raw;
        } catch (e) {
          if (e instanceof BadRequestException) throw e;
          if (this.isResponsibleBrokerUnavailable(e)) {
            throw new BadRequestException(
              'Responsible broker selection requires the ResponsibleBroker table. Run database migrations, then try again.',
            );
          }
          throw e;
        }
      }
    }

    if (Object.keys(profilePartial).length > 0) {
      updates.push(this.mergeAgentProfileMemory(userId, workspaceId, profilePartial));
    }

    await Promise.all(updates);

    return this.getUserProfile(userId, workspaceId);
  }

  async createWorkspace(data: { name: string; slug: string }, userId: string) {
    const existing = await this.prisma.workspace.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new BadRequestException('A workspace with this slug already exists');
    }

    const workspace = await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { name: data.name, slug: data.slug },
      });

      await tx.workspaceMembership.create({
        data: { workspaceId: ws.id, userId, role: 'admin' },
      });

      await tx.workspaceSettings.create({
        data: { workspaceId: ws.id },
      });

      return ws;
    });

    return { id: workspace.id, name: workspace.name, slug: workspace.slug, role: 'admin' };
  }
}
