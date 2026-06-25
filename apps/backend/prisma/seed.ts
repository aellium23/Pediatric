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

  // Idempotent across re-seeds (the seed runs on every Render boot): clear this
  // pediatrician's services first so they don't accumulate duplicates.
  await prisma.pediatricianService.deleteMany({ where: { pediatricianId: ped.id } });
  await prisma.pediatricianService.createMany({
    data: [
      { pediatricianId: ped.id, type: ServiceType.MESSAGE, priceCents: 1800, slaHours: 4, scopeText: '1 questão + esclarecimentos' },
      { pediatricianId: ped.id, type: ServiceType.VIDEO, priceCents: 4500, slaHours: 24 },
    ],
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

  // A demo clinic linking the clinic users + the demo pediatrician (idempotent).
  const clinicAdmin = await prisma.user.findUnique({ where: { email: 'clinica.admin@demo.pedia' } });
  const clinicStaff = await prisma.user.findUnique({ where: { email: 'clinica.staff@demo.pedia' } });
  if (clinicAdmin && clinicStaff) {
    let clinic = await prisma.clinic.findFirst({ where: { name: 'Clínica Demo' } });
    clinic ??= await prisma.clinic.create({ data: { name: 'Clínica Demo', taxId: '500000000' } });
    const clinicMembers: { user: { id: string }; role: Role }[] = [
      { user: clinicAdmin, role: Role.CLINIC_ADMIN },
      { user: clinicStaff, role: Role.CLINIC_STAFF },
    ];
    for (const cm of clinicMembers) {
      await prisma.clinicMember.upsert({
        where: { clinicId_userId: { clinicId: clinic.id, userId: cm.user.id } },
        create: { clinicId: clinic.id, userId: cm.user.id, role: cm.role },
        update: { role: cm.role },
      });
    }
    await prisma.clinicPediatrician.upsert({
      where: { clinicId_pediatricianId: { clinicId: clinic.id, pediatricianId: ped.id } },
      create: { clinicId: clinic.id, pediatricianId: ped.id, revenueSharePct: 20 },
      update: {},
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
