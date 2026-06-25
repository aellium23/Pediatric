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

  // A demo user for every profile (sign in with POST /auth/dev-login { email }).
  const demoUsers: { email: string; role: Role }[] = [
    { email: 'marta@demo.pedia', role: Role.PARENT },
    { email: 'clinica.admin@demo.pedia', role: Role.CLINIC_ADMIN },
    { email: 'clinica.staff@demo.pedia', role: Role.CLINIC_STAFF },
    { email: 'admin@demo.pedia', role: Role.PLATFORM_ADMIN },
    { email: 'suporte@demo.pedia', role: Role.SUPPORT },
    { email: 'financas@demo.pedia', role: Role.FINANCE },
    { email: 'compliance@demo.pedia', role: Role.COMPLIANCE },
  ];
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { email: u.email, emailVerified: true, role: u.role },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    'Seeded demo pediatrician:',
    ped.id,
    '+ demo users:',
    ['ines@demo.pedia (pediatra)', ...demoUsers.map((u) => `${u.email} (${u.role})`)].join(', '),
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
