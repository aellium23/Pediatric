import { Controller, Get, Injectable, Module, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PediatricianStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PediatriciansService {
  constructor(private readonly prisma: PrismaService) {}

  /** Marketplace listing: only ACTIVE (verified) pediatricians, with services. */
  async list(language?: string) {
    return this.prisma.pediatrician.findMany({
      where: {
        status: PediatricianStatus.ACTIVE,
        ...(language ? { languages: { has: language } } : {}),
      },
      select: {
        id: true,
        bio: true,
        experienceYears: true,
        languages: true,
        specialties: true,
        ratingAvg: true,
        services: {
          where: { active: true },
          select: { id: true, type: true, priceCents: true, currency: true, slaHours: true },
        },
      },
      orderBy: { ratingAvg: 'desc' },
    });
  }

  async getOne(id: string) {
    return this.prisma.pediatrician.findFirstOrThrow({
      where: { id, status: PediatricianStatus.ACTIVE },
      include: { services: { where: { active: true } } },
    });
  }
}

@ApiTags('pediatricians')
@ApiBearerAuth()
@Controller('pediatricians')
class PediatriciansController {
  constructor(private readonly service: PediatriciansService) {}

  @Get()
  list(@Query('language') language?: string) {
    return this.service.list(language);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }
}

@Module({
  controllers: [PediatriciansController],
  providers: [PediatriciansService],
  exports: [PediatriciansService],
})
export class PediatriciansModule {}
