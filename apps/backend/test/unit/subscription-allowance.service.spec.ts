import { Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import {
  SubscriptionsService,
  monthStart,
} from '../../src/modules/subscriptions/subscriptions.module';

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    subscription: { findFirst: jest.fn().mockResolvedValue(null) },
    familyMember: { findMany: jest.fn().mockResolvedValue([{ familyId: 'fam1' }]) },
    consultation: { count: jest.fn().mockResolvedValue(0) },
    ...over,
  };
  return { service: new SubscriptionsService(prisma), prisma };
}

const active = (plan: SubscriptionPlan = SubscriptionPlan.FAMILY) => ({
  subscription: {
    findFirst: jest.fn().mockResolvedValue({ id: 's1', plan, status: SubscriptionStatus.ACTIVE }),
  },
});

describe('monthStart', () => {
  it('is the first instant of the calendar month, in UTC', () => {
    expect(monthStart(new Date('2026-09-09T16:44:00.000Z')).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    // Last second of a month still belongs to that month.
    expect(monthStart(new Date('2026-01-31T23:59:59.999Z')).toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });
});

describe('SubscriptionsService.allowance', () => {
  it('gives no allowance without an active plan, and does not query usage', async () => {
    const { service, prisma } = build();
    const a = await service.allowance('u1');
    expect(a).toEqual(
      expect.objectContaining({ plan: null, includedMessages: 0, remainingMessages: 0 }),
    );
    // No plan → nothing to count; skip the work entirely.
    expect(prisma.consultation.count).not.toHaveBeenCalled();
  });

  it('reports what the family plan includes and what is left', async () => {
    const { service } = build({
      ...active(),
      consultation: { count: jest.fn().mockResolvedValue(1) },
    });
    const a = await service.allowance('u1');
    expect(a.plan).toBe(SubscriptionPlan.FAMILY);
    expect(a.includedMessages).toBe(1);
    expect(a.usedMessages).toBe(1);
    expect(a.remainingMessages).toBe(0);
  });

  it('never reports negative remaining, even if usage somehow exceeds the plan', async () => {
    const { service } = build({
      ...active(),
      consultation: { count: jest.fn().mockResolvedValue(5) },
    });
    expect((await service.allowance('u1')).remainingMessages).toBe(0);
  });

  // The allowance belongs to the family: two guardians share one plan.
  it('counts usage across every family the user belongs to, in this month only', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const { service } = build({
      ...active(),
      familyMember: { findMany: jest.fn().mockResolvedValue([{ familyId: 'a' }, { familyId: 'b' }]) },
      consultation: { count },
    });
    await service.allowance('u1');
    const where = count.mock.calls[0][0].where;
    expect(where.familyId).toEqual({ in: ['a', 'b'] });
    expect(where.coveredCents).toEqual({ gt: 0 });
    expect(where.openedAt.gte.toISOString()).toBe(monthStart().toISOString());
  });

  it('handles a subscriber who has no family yet', async () => {
    const { service, prisma } = build({
      ...active(),
      familyMember: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const a = await service.allowance('u1');
    expect(a.usedMessages).toBe(0);
    expect(a.remainingMessages).toBe(1);
    expect(prisma.consultation.count).not.toHaveBeenCalled();
  });

  it("gives a pediatrician's plan no message allowance", async () => {
    const { service } = build(active(SubscriptionPlan.PED_PRO));
    expect((await service.allowance('u1')).includedMessages).toBe(0);
  });
});

/**
 * The cap is what bounds the platform's exposure. The inclusion is a promise
 * the platform makes, but the price is set by each pediatrician — without a
 * cap, one who charges €30 costs €24 against €9,90 of subscription revenue,
 * and there is no ceiling at all.
 */
describe('SubscriptionsService.coverageFor', () => {
  const unspent = () => ({ ...active(), consultation: { count: jest.fn().mockResolvedValue(0) } });
  const spent = () => ({ ...active(), consultation: { count: jest.fn().mockResolvedValue(1) } });

  it('covers a consultation priced below the cap in full', async () => {
    const { service } = build(unspent());
    expect(await service.coverageFor('u1', 1800)).toBe(1800);
  });

  it('covers exactly the cap when the price sits on it', async () => {
    const { service } = build(unspent());
    expect(await service.coverageFor('u1', 2000)).toBe(2000);
  });

  // The family pays the difference; the platform's cost stops rising.
  it('covers only up to the cap above it, however expensive the pediatrician', async () => {
    const { service } = build(unspent());
    expect(await service.coverageFor('u1', 3000)).toBe(2000);
    expect(await service.coverageFor('u1', 9900)).toBe(2000);
  });

  it('covers nothing once the allowance is spent', async () => {
    const { service } = build(spent());
    expect(await service.coverageFor('u1', 1800)).toBe(0);
  });

  it('covers nothing without a plan', async () => {
    const { service } = build();
    expect(await service.coverageFor('u1', 1800)).toBe(0);
  });

  it('covers nothing for a free or nonsensical price', async () => {
    const { service } = build(unspent());
    expect(await service.coverageFor('u1', 0)).toBe(0);
    expect(await service.coverageFor('u1', -100)).toBe(0);
  });
});

describe('plan catalog', () => {
  it("advertises the inclusion the allowance actually enforces", async () => {
    const { service } = build();
    const family = service.plansFor(Role.PARENT).find((p) => p.plan === 'FAMILY');
    expect(family?.includedMessages).toBe(1);
    expect(family?.coveredCapCents).toBe(2000);
    // The perk text is generated from the number, so they cannot drift — but
    // assert it anyway: this is the sentence a family reads before paying.
    const n = family?.includedMessages as number;
    expect(family?.perks.join(' ')).toContain(
      n === 1 ? '1 consulta por mensagem incluída' : `${n} consultas por mensagem incluídas`,
    );
    // The cap is a promise too, so it has to be on the card the family reads.
    expect(family?.perks.join(' ')).toContain('até €20,00 cada');
  });
});
