import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding EPS providers...');

  const epsProviders = [
    { name: 'Salud Total EPS - Virrey Solis', code: 'EPS002', parserKey: 'salud_total' },
    { name: 'Nueva EPS', code: 'EPS037', parserKey: 'nueva_eps' },
    { name: 'EPS Sanitas', code: 'EPS005', parserKey: 'sanitas' },
    { name: 'EPS Sura', code: 'EPS010', parserKey: 'sura' },
    { name: 'Compensar EPS', code: 'EPS008', parserKey: 'compensar' },
    { name: 'Famisanar EPS', code: 'EPS017', parserKey: 'famisanar' },
    { name: 'Coosalud EPS', code: 'EPS019', parserKey: 'coosalud' },
    { name: 'Mutual Ser EPS', code: 'ESS024', parserKey: 'mutual_ser' },
    { name: 'Aliansalud EPS', code: 'EPS001', parserKey: 'aliansalud' },
    { name: 'Capital Salud EPS', code: 'EPS039', parserKey: 'capital_salud' },
  ];

  for (const eps of epsProviders) {
    await prisma.epsProvider.upsert({
      where: { code: eps.code },
      update: { name: eps.name, parserKey: eps.parserKey },
      create: eps,
    });
  }

  console.log(`✅ ${epsProviders.length} EPS providers seeded successfully`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });