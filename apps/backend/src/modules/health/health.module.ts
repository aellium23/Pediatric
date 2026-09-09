import { Controller, Get } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/security/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Public()
  @Get('health/ready')
  async readiness(): Promise<{ status: string; db: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch {
      return { status: 'degraded', db: 'down' };
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
