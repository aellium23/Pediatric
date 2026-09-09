import { Injectable } from '@nestjs/common';
import { PediatricianStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Parent's favourite pediatricians. */
@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, pediatricianId: string) {
    return this.prisma.favorite.upsert({
      where: { userId_pediatricianId: { userId, pediatricianId } },
      create: { userId, pediatricianId },
      update: {},
    });
  }

  async remove(userId: string, pediatricianId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, pediatricianId } });
    return { removed: true };
  }

  async list(userId: string) {
    const favs = await this.prisma.favorite.findMany({ where: { userId } });
    const ids = favs.map((f) => f.pediatricianId);
    if (ids.length === 0) return [];
    const peds = await this.prisma.pediatrician.findMany({
      where: { id: { in: ids }, status: PediatricianStatus.ACTIVE },
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
    });
    return peds;
  }
}
