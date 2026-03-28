import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { email: string; name: string; password: string },
  ) {
    if (!body.email || !body.name || !body.password) {
      throw new HttpException('email, name, and password are required', HttpStatus.BAD_REQUEST);
    }
    if (body.password.length < 6) {
      throw new HttpException('Password must be at least 6 characters', HttpStatus.BAD_REQUEST);
    }
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new HttpException('email and password are required', HttpStatus.BAD_REQUEST);
    }
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new HttpException('Missing x-user-id header', HttpStatus.UNAUTHORIZED);
    }
    return this.authService.me(userId);
  }

  @Patch('onboarding')
  async onboarding(
    @Req() req: Request,
    @Body() body: {
      workspaceId: string;
      workspaceName?: string;
      phone?: string;
      licenseNumber?: string;
      company?: string;
      market?: string;
    },
  ) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new HttpException('Missing x-user-id header', HttpStatus.UNAUTHORIZED);
    }
    if (!body.workspaceId) {
      throw new HttpException('workspaceId is required', HttpStatus.BAD_REQUEST);
    }
    return this.authService.updateOnboarding(userId, body.workspaceId, body);
  }

  @Post('workspaces')
  async createWorkspace(
    @Req() req: Request,
    @Body() body: { name: string; slug: string },
  ) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new HttpException('Missing x-user-id header', HttpStatus.UNAUTHORIZED);
    }
    if (!body.name || !body.slug) {
      throw new HttpException('name and slug are required', HttpStatus.BAD_REQUEST);
    }
    return this.authService.createWorkspace(body, userId);
  }
}
