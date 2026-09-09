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
      // expireOverdue queries twice: message SLA breaches, then video no-shows.
      findMany: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'c-overdue', status: ConsultationStatus.OPEN }])
        .mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ ...consultationRecord, status: ConsultationStatus.CLOSED }),
    },
    familyMember: { findFirst: jest.fn().mockResolvedValue(null) },
    message: { create: jest.fn() },
  };
  const crypto: any = {
    encrypt: (s: string) => `enc(${s})`,
    decrypt: (s: string) => s,
    decryptSafe: (s: string) => s,
  };
  const consent: any = { assertHealthConsent: jest.fn() };
  const payments: any = {
    captureAndSplit: jest.fn().mockResolvedValue({ platformFeeCents: 360, pediatricianAmount: 1440 }),
    refundForConsultation: jest.fn().mockResolvedValue(undefined),
  };
  const events: any = { emit: jest.fn() };
  const ai: any = { structureClinicalNote: jest.fn().mockResolvedValue('soap') };
  // No plan by default: coversNextMessage() false keeps existing expectations
  // about paid consultations intact.
  const subscriptions: any = { coversNextMessage: jest.fn().mockResolvedValue(false) };

  const service = new ConsultationsService(prisma, crypto, consent, payments, subscriptions, events, ai);
  return { service, prisma, payments, events, subscriptions };
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

  it('close() rejects an EXPIRED consultation (would re-capture a refunded payment)', async () => {
    const { service, payments } = build({ status: ConsultationStatus.EXPIRED });
    await expect(service.close('ped-user', 'c1')).rejects.toThrow('já não pode ser encerrada');
    expect(payments.captureAndSplit).not.toHaveBeenCalled();
  });

  it('sendMessage() rejects a settled consultation (read-only after close/refund)', async () => {
    const { service, prisma } = build({ status: ConsultationStatus.REFUNDED });
    await expect(
      service.sendMessage('ped-user', 'c1', { body: 'olá' } as any),
    ).rejects.toThrow('já não recebe mensagens');
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('sendMessage() rejects an empty message (no text, no photos)', async () => {
    const { service, prisma } = build();
    await expect(service.sendMessage('ped-user', 'c1', { body: '  ' } as any)).rejects.toThrow(
      'precisa de texto ou de uma foto',
    );
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('sendMessage() rejects non-image attachments', async () => {
    const { service, prisma } = build();
    await expect(
      service.sendMessage('ped-user', 'c1', {
        body: 'vídeo',
        attachments: ['data:video/mp4;base64,AAAA'],
      } as any),
    ).rejects.toThrow('Apenas fotos');
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('sendMessage() encrypts photo attachments at rest', async () => {
    const { service, prisma } = build();
    prisma.message.create.mockResolvedValue({ id: 'm1', createdAt: new Date() });
    await service.sendMessage('ped-user', 'c1', {
      body: 'foto da borbulha',
      attachments: ['data:image/jpeg;base64,AAAA'],
    } as any);
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: 'enc(foto da borbulha)',
          attachments: ['enc(data:image/jpeg;base64,AAAA)'],
        }),
      }),
    );
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
