import { ForbiddenException, Injectable } from '@nestjs/common';
import { Child, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './jwt.strategy';

/**
 * The single rule for "may this user see this child's clinical data":
 * a parent must be a member of the child's family; a pediatrician must have
 * consulted that child. Shared rather than copied, because two drifting copies
 * of an authorization rule is how an IDOR gets shipped.
 */
@Injectable()
export class ChildAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the child so callers can use birthDate/sex (e.g. WHO percentiles). */
  async assertAccess(user: AuthenticatedUser, childId: string): Promise<Child> {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new ForbiddenException('Criança não encontrada.');

    if (user.role === Role.PARENT) {
      const member = await this.prisma.familyMember.findFirst({
        where: { userId: user.userId, familyId: child.familyId },
      });
      if (!member) throw new ForbiddenException('Sem autorização para esta criança.');
      return child;
    }

    if (user.role === Role.PEDIATRICIAN) {
      const ped = await this.prisma.pediatrician.findUnique({ where: { userId: user.userId } });
      const link = ped
        ? await this.prisma.consultation.findFirst({ where: { childId, pediatricianId: ped.id } })
        : null;
      if (!link) throw new ForbiddenException('Não existe consulta com esta criança.');
      return child;
    }

    throw new ForbiddenException('Sem autorização.');
  }
}
