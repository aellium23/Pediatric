import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsentSubject } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { normalizeRegion } from '../../common/regions';
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
      throw new ForbiddenException('É necessário consentimento para dados de saúde.');
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

  /**
   * Sets (or clears, with null) the child's SNS/utente number. Health-adjacent
   * identifier → AES-256-GCM ciphertext at rest, like healthProfile.
   */
  async setSns(userId: string, childId: string, snsNumber?: string | null) {
    await this.assertOwnership(userId, childId);
    await this.prisma.child.update({
      where: { id: childId },
      data: { snsNumber: snsNumber ? this.crypto.encrypt(snsNumber) : null },
    });
    return { ok: true };
  }

  /** The family the caller belongs to (region/postal feed market analytics). */
  async getFamilyForUser(userId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: { family: true },
    });
    if (!member) return null;
    const { id, name, region, postalCode } = member.family;
    return { id, name, region, postalCode };
  }

  /**
   * Sets the family's region (+ optional 4-digit postal prefix). Only family
   * members can set it; the family is resolved from the caller's own
   * membership, so no cross-family write is possible.
   */
  async setFamilyRegion(userId: string, regionInput: string, postalCode?: string) {
    const region = normalizeRegion(regionInput);
    if (!region) throw new BadRequestException('Região inválida.');
    const member = await this.prisma.familyMember.findFirst({ where: { userId } });
    if (!member) throw new ForbiddenException('Sem família associada.');
    await this.prisma.family.update({
      where: { id: member.familyId },
      data: { region, ...(postalCode !== undefined ? { postalCode } : {}) },
    });
    return { ok: true, region, postalCode: postalCode ?? null };
  }

  /** Sets the child's avatar (parent in the family only). */
  async setPhoto(userId: string, childId: string, photoUrl: string) {
    if (!photoUrl.startsWith('data:image/') && !photoUrl.startsWith('https://')) {
      throw new BadRequestException('Formato de imagem inválido.');
    }
    await this.assertOwnership(userId, childId);
    await this.prisma.child.update({ where: { id: childId }, data: { photoUrl } });
    return { ok: true };
  }

  /** Ownership check: the user must belong to the child's family. */
  private async assertOwnership(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Criança não encontrada.');
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });
    if (!member) throw new ForbiddenException('Sem autorização para esta criança.');
    return child;
  }

  private async toDto(childId: string, _familyId: string | undefined, userId: string) {
    const child = await this.assertOwnership(userId, childId);
    // Detail view (the boletim): the SNS number is decrypted here only.
    return this.decrypt(child, { withSns: true });
  }

  private decrypt(
    child: { healthProfile: string | null; snsNumber?: string | null } & Record<string, unknown>,
    opts: { withSns?: boolean } = {},
  ) {
    const decrypted = this.crypto.decryptSafe(child.healthProfile);
    const health: HealthProfile = decrypted
      ? JSON.parse(decrypted)
      : { allergies: [], medications: [], conditions: [] };
    // snsNumber ciphertext never leaves the service; lists omit it entirely
    // and only the detail decrypts it.
    const { healthProfile, snsNumber, ...rest } = child;
    return {
      ...rest,
      health,
      ...(opts.withSns ? { snsNumber: this.crypto.decryptSafe(snsNumber ?? null) } : {}),
    };
  }
}
