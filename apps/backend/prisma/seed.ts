import { PrismaClient, Role, PediatricianStatus, ServiceType } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // A verified demo pediatrician with a message service.
  const user = await prisma.user.upsert({
    where: { email: 'ines@demo.pedia' },
    update: {},
    create: {
      email: 'ines@demo.pedia',
      emailVerified: true,
      role: Role.PEDIATRICIAN,
      mfaEnabled: true,
    },
  });

  const ped = await prisma.pediatrician.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      licenseNumber: 'OM-12345',
      licenseVerifiedAt: new Date(),
      bio: 'Pediatria geral, 15 anos de experiência.',
      experienceYears: 15,
      languages: ['pt', 'en'],
      specialties: ['general'],
      status: PediatricianStatus.ACTIVE,
      ratingAvg: 4.9,
    },
  });

  await prisma.pediatricianService.createMany({
    data: [
      { pediatricianId: ped.id, type: ServiceType.MESSAGE, priceCents: 1800, slaHours: 4, scopeText: '1 questão + esclarecimentos' },
      { pediatricianId: ped.id, type: ServiceType.VIDEO, priceCents: 4500, slaHours: 24 },
    ],
    skipDuplicates: true,
  });

  // eslint-disable-next-line no-console
  console.log('Seeded demo pediatrician:', ped.id);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
