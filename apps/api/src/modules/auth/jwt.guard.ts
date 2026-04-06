import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import type { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwksClient: JwksClient | null = null;

  constructor(private readonly prisma: PrismaService) {
    const domain = process.env.AUTH0_DOMAIN;
    if (domain) {
      this.jwksClient = new JwksClient({
        jwksUri: `https://${domain}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      // Fall through to header-based auth handled by TenantContextMiddleware
      return true;
    }

    if (!this.jwksClient) {
      return true; // Auth0 not configured, skip JWT validation
    }

    const token = authHeader.slice(7);
    try {
      const decoded = await this.verifyToken(token);
      const sub = decoded.sub as string;
      const email = (decoded as any).email as string | undefined;

      // Resolve or create user from Auth0 sub
      let user = await this.prisma.user.findFirst({ where: { auth0Sub: sub } });
      if (!user && email) {
        user = await this.prisma.user.findUnique({ where: { email } });
        if (user) {
          await this.prisma.user.update({ where: { id: user.id }, data: { auth0Sub: sub } });
        }
      }

      if (!user) {
        return false;
      }

      // If x-workspace-id is provided, validate membership
      const workspaceId = req.headers['x-workspace-id'] as string | undefined;
      if (workspaceId) {
        const membership = await this.prisma.workspaceMembership.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: user.id } },
        });

        if (!membership) {
          return false;
        }

        (req as any).tenantContext = {
          workspaceId,
          userId: user.id,
          role: membership.role,
          requestId: (req as any).requestId,
        };
      } else {
        // Get first workspace
        const membership = await this.prisma.workspaceMembership.findFirst({
          where: { userId: user.id },
        });
        if (membership) {
          (req as any).tenantContext = {
            workspaceId: membership.workspaceId,
            userId: user.id,
            role: membership.role,
            requestId: (req as any).requestId,
          };
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async verifyToken(token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          this.jwksClient!.getSigningKey(header.kid, (err, key) => {
            if (err) return callback(err);
            callback(null, key?.getPublicKey());
          });
        },
        {
          audience: process.env.AUTH0_AUDIENCE ?? process.env.AUTH0_CLIENT_ID,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded as jwt.JwtPayload);
        },
      );
    });
  }
}
