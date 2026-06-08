import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

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
      rules:       '• Matches al mejor de 3\n• Maps elegidos por sorteo\n• Check-in obligatorio 30 min antes\n• Cero tolerancia al toxicity',
      registrationStart: new Date(),
      registrationEnd:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startDate:         new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      createdById: 'system',
    },
  })

  console.log(`✅ Tournament created: ${tournament.name}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
