import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsentSubject } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { CreateChildDto } from './dto/children.dto';

interface HealthProfile {
  allergies: string[];
  medications: string[];
  conditions: string[];
}

@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
  ) {}

  /** Creates a child + encrypted health profile, gated by explicit consent. */
  async create(userId: string, dto: CreateChildDto) {
    if (!dto.healthDataConsent) {
      throw new ForbiddenException('Health data consent is required');
    }

    // Resolve (or lazily create) the user's family.
    let member = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: { family: true },
    });
    if (!member) {
      const family = await this.prisma.family.create({
        data: { name: 'Família', primaryUserId: userId },
      });
      member = await this.prisma.familyMember.create({
        data: { familyId: family.id, userId, relationship: 'guardian' },
        include: { family: true },
      });
    }

    const profile: HealthProfile = {
      allergies: dto.allergies ?? [],
      medications: dto.medications ?? [],
      conditions: dto.conditions ?? [],
    };

    const child = await this.prisma.child.create({
      data: {
        familyId: member.familyId,
        name: dto.name,
        birthDate: new Date(dto.birthDate),
        sex: dto.sex,
        usualDoctor: dto.usualDoctor,
        healthProfile: this.crypto.encrypt(JSON.stringify(profile)),
      },
    });

    // Record immutable, versioned consent for this child's health data.
    await this.prisma.consent.create({
      data: {
        userId,
        childId: child.id,
        subject: ConsentSubject.HEALTH_DATA,
        version: '2026-06-01',
        evidence: { ip: 'recorded-at-api', method: 'explicit' },
      },
    });

    return this.toDto(child.id, member.familyId, userId);
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({ where: { userId } });
    const familyIds = memberships.map((m) => m.familyId);
    const children = await this.prisma.child.findMany({
      where: { familyId: { in: familyIds } },
    });
    return children.map((c) => this.decrypt(c));
  }

  async getOne(userId: string, childId: string) {
    return this.toDto(childId, undefined, userId);
  }

  /** Ownership check: the user must belong to the child's family. */
  private async assertOwnership(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });
    if (!member) throw new ForbiddenException('Not authorized for this child');
    return child;
  }

  private async toDto(childId: string, _familyId: string | undefined, userId: string) {
    const child = await this.assertOwnership(userId, childId);
    return this.decrypt(child);
  }

  private decrypt(child: { healthProfile: string | null } & Record<string, unknown>) {
    const decrypted = this.crypto.decrypt(child.healthProfile);
    const health: HealthProfile = decrypted
      ? JSON.parse(decrypted)
      : { allergies: [], medications: [], conditions: [] };
    const { healthProfile, ...rest } = child;
    return { ...rest, health };
  }
}
