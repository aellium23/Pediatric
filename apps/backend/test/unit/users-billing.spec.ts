import { BadRequestException } from '@nestjs/common';
import { UsersService, isValidNif } from '../../src/modules/users/users.module';

function build() {
  const prisma: any = {
    user: {
      update: jest.fn().mockResolvedValue({}),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'u1' }),
    },
  };
  return { service: new UsersService(prisma as any), prisma };
}

describe('isValidNif', () => {
  it.each([
    // Valid check digits (mod-11 over the first 8 digits).
    ['123456789', true],
    ['999999990', true],
    ['501442600', true], // classic corporate-style NIF with valid checksum
    // Wrong check digit.
    ['123456780', false],
    ['999999991', false],
    // Shape violations.
    ['12345678', false],
    ['1234567890', false],
    ['12345678a', false],
    ['abcdefghi', false],
    ['', false],
  ])('isValidNif(%p) → %p', (nif, expected) => {
    expect(isValidNif(nif as string)).toBe(expected);
  });
});

describe('UsersService.setBilling', () => {
  it('stores a NIF with a valid checksum', async () => {
    const { service, prisma } = build();
    const res = await service.setBilling('u1', '123456789');
    expect(res).toEqual({ ok: true, nif: '123456789' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { nif: '123456789' },
    });
  });

  it('rejects an invalid checksum with "NIF inválido."', async () => {
    const { service, prisma } = build();
    const err = await service.setBilling('u1', '123456780').catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe('NIF inválido.');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects non-9-digit input', async () => {
    const { service } = build();
    await expect(service.setBilling('u1', '12345')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setBilling('u1', 'PT1234567')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('null clears the stored NIF', async () => {
    const { service, prisma } = build();
    const res = await service.setBilling('u1', null);
    expect(res).toEqual({ ok: true, nif: null });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { nif: null } });
  });

  it('undefined also clears (omitting the field in the POST body)', async () => {
    const { service, prisma } = build();
    await service.setBilling('u1', undefined);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { nif: null } });
  });
});

describe('UsersService.me', () => {
  it('includes nif in the profile selection', async () => {
    const { service, prisma } = build();
    await service.me('u1');
    const select = prisma.user.findUniqueOrThrow.mock.calls[0][0].select;
    expect(select.nif).toBe(true);
  });
});
