import { ForbiddenException } from '@nestjs/common';
import { ConsultationStatus } from '@prisma/client';
import { ConsultationsService } from '../../src/modules/consultations/consultations.service';

/** Minimal mocks for the consultation lifecycle (close + SLA expiry). */
function build(overrides: Record<string, any> = {}) {
  const consultationRecord = {
    id: 'c1',
    familyId: 'f1',
    status: ConsultationStatus.ANSWERED,
    pediatrician: { userId: 'ped-user' },
    ...overrides,
  };

  const prisma: any = {
    consultation: {
      findUnique: jest.fn().mockResolvedValue(consultationRecord),
      findMany: jest.fn().mockResolvedValue([
        { id: 'c-overdue', status: ConsultationStatus.OPEN },
      ]),
      update: jest.fn().mockResolvedValue({ ...consultationRecord, status: ConsultationStatus.CLOSED }),
    },
    familyMember: { findFirst: jest.fn().mockResolvedValue(null) },
    message: { create: jest.fn() },
  };
  const crypto: any = { encrypt: (s: string) => `enc(${s})`, decrypt: (s: string) => s };
  const consent: any = { assertHealthConsent: jest.fn() };
  const payments: any = {
    captureAndSplit: jest.fn().mockResolvedValue({ platformFeeCents: 360, pediatricianAmount: 1440 }),
    refundForConsultation: jest.fn().mockResolvedValue(undefined),
  };
  const events: any = { emit: jest.fn() };
  const ai: any = { structureClinicalNote: jest.fn().mockResolvedValue('soap') };

  const service = new ConsultationsService(prisma, crypto, consent, payments, events, ai);
  return { service, prisma, payments, events };
}

describe('ConsultationsService', () => {
  it('close() rejects when the caller is not the assigned pediatrician', async () => {
    const { service } = build({ pediatrician: { userId: 'someone-else' } });
    await expect(service.close('ped-user', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('close() captures payment, splits, and emits domain events', async () => {
    const { service, payments, events } = build();
    await service.close('ped-user', 'c1');
    expect(payments.captureAndSplit).toHaveBeenCalledWith('c1');
    expect(events.emit).toHaveBeenCalledWith('consultation.closed', expect.anything());
    expect(events.emit).toHaveBeenCalledWith('payment.captured', expect.anything());
  });

  it('setSummary() rejects a caller who is not the assigned pediatrician', async () => {
    const { service } = build({ pediatrician: { userId: 'someone-else' } });
    await expect(service.setSummary('ped-user', 'c1', 'nota')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('setSummary() encrypts the note before persisting it', async () => {
    const { service, prisma } = build();
    await service.setSummary('ped-user', 'c1', 'nota clínica');
    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { summary: 'enc(nota clínica)' },
    });
  });

  it('getSummary() returns the decrypted note to a participant', async () => {
    const { service, prisma } = build();
    prisma.consultation.findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'c1', familyId: 'f1', pediatrician: { userId: 'ped-user' } })
      .mockResolvedValueOnce({ summary: 'texto-decifrado' });
    const result = await service.getSummary('ped-user', 'c1');
    expect(result).toEqual({ summary: 'texto-decifrado' });
  });

  it('expireOverdue() refunds and expires consultations past SLA', async () => {
    const { service, prisma, payments, events } = build();
    const count = await service.expireOverdue();
    expect(count).toBe(1);
    expect(payments.refundForConsultation).toHaveBeenCalledWith('c-overdue', 'sla_breached');
    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: 'c-overdue' },
      data: { status: ConsultationStatus.EXPIRED },
    });
    expect(events.emit).toHaveBeenCalledWith('consultation.expired', expect.anything());
  });
});
