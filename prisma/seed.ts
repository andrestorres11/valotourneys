// prisma/seed.ts
// Run with: npm run db:seed
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Sample tournament
  const tournament = await prisma.tournament.upsert({
    where: { id: 'seed-tournament-1' },
    update: {},
    create: {
      id:          'seed-tournament-1',
      name:        'ValoTourneys Open #1',
      description: 'Primer torneo oficial de la plataforma. ¡Demuestra tu nivel!',
      gameMode:    'COMPETITIVE',
      status:      'REGISTRATION_OPEN',
      minRank:     'SILVER_1',
      maxRank:     'DIAMOND_3',
      maxTeams:    16,
      teamSize:    5,
      prizePool:   'Reconocimiento + badges exclusivos',
      rules:       '• Matches al mejor de 3\n• Maps elegidos por sorteo\n• Check-in obligatorio 30 min antes\n• Cero tolerancia al toxicity',
      registrationStart: new Date(),
      registrationEnd:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startDate:         new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      createdById: 'system',
    },
  })

  console.log(`✅ Tournament created: ${tournament.name}`)
  console.log('\n📋 Next steps:')
  console.log('1. Set up Neon PostgreSQL and add DATABASE_URL to .env')
  console.log('2. Create Clerk app and add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY')
  console.log('3. Add HENRIK_API_KEY and GROQ_API_KEY')
  console.log('4. Run: npm run db:generate && npm run db:push')
  console.log('5. Run: npm run dev')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
