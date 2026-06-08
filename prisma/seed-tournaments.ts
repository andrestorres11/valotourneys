// prisma/seed-tournaments.ts
// Run: npx tsx prisma/seed-tournaments.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const tournaments = [
  {
    name:        'Copa Hierro I - 1v1 Deathmatch',
    description: 'Demuestra tu aim en este torneo individual. Hierro y Bronce bienvenidos.',
    gameMode:    'DEATHMATCH' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'UNRANKED' as const,
    maxRank:     'BRONZE_3' as const,
    maxTeams:    16,
    teamSize:    1,
    rules:       '• Mejor de 3 rondas\n• Sin smurfs\n• Check-in 20 min antes',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'Duelo de Platas - 1v1',
    description: 'Solo para Plata. ¿Quién sube a Oro primero?',
    gameMode:    'COMPETITIVE' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'SILVER_1' as const,
    maxRank:     'SILVER_3' as const,
    maxTeams:    32,
    teamSize:    1,
    rules:       '• Sin smurfs verificados por Riot ID\n• Mejor de 3',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'Duo Cup Latinoamérica',
    description: 'Torneo de dúos. Trae a tu mejor compañero y demuestra trabajo en equipo.',
    gameMode:    'COMPETITIVE' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'GOLD_1' as const,
    maxRank:     'PLATINUM_3' as const,
    maxTeams:    16,
    teamSize:    2,
    rules:       '• Dúos de Oro a Platino\n• Mejor de 3 mapas\n• Mapa elegido por sorteo',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'Trio Spike Rush Challenge',
    description: 'Spike Rush en formato trío. Rápido, caótico y divertido.',
    gameMode:    'SPIKE_RUSH' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'UNRANKED' as const,
    maxRank:     'GOLD_3' as const,
    maxTeams:    12,
    teamSize:    3,
    rules:       '• Tríos de cualquier rango hasta Oro\n• Mejor de 5 rondas de Spike Rush',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'ValoTourneys Open #2 - 5v5',
    description: 'El torneo más grande de la plataforma. Equipos completos compiten por el título.',
    gameMode:    'COMPETITIVE' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'SILVER_1' as const,
    maxRank:     'DIAMOND_3' as const,
    maxTeams:    16,
    teamSize:    5,
    rules:       '• Equipos de 5\n• Rango Plata a Diamante\n• Mejor de 3\n• Check-in obligatorio 30 min antes\n• Cero toxicidad',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'Torneo Diamante+ - Élite 5v5',
    description: 'Solo para los mejores. Diamante, Ascendente e Inmortal.',
    gameMode:    'COMPETITIVE' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'DIAMOND_1' as const,
    maxRank:     'IMMORTAL_3' as const,
    maxTeams:    8,
    teamSize:    5,
    rules:       '• Equipos completos de Diamante a Inmortal\n• Todos los miembros verificados\n• Mejor de 3, final Mejor de 5',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'Escalation Frenzy - 1v1',
    description: 'Escalation individual. El más rápido en completar los 12 niveles gana.',
    gameMode:    'ESCALATION' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'UNRANKED' as const,
    maxRank:     'RADIANT' as const,
    maxTeams:    32,
    teamSize:    1,
    rules:       '• Abierto a todos los rangos\n• Escalation 1v1\n• Sin límite de rango',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'Copa Universitaria LATAM',
    description: 'Torneo especial para jugadores universitarios. Equipos de 5.',
    gameMode:    'UNRATED' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'UNRANKED' as const,
    maxRank:     'PLATINUM_3' as const,
    maxTeams:    16,
    teamSize:    5,
    rules:       '• Solo jugadores universitarios\n• Sin clasificar\n• Equipos de 5\n• Rango hasta Platino',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'Replication Roulette - Duo',
    description: 'Replication en dúos. El agente es aleatorio, la victoria no.',
    gameMode:    'REPLICATION' as const,
    status:      'REGISTRATION_OPEN' as const,
    minRank:     'UNRANKED' as const,
    maxRank:     'SILVER_3' as const,
    maxTeams:    16,
    teamSize:    2,
    rules:       '• Dúos hasta Plata\n• Modo Replication\n• Mejor de 3',
    registrationStart: new Date(),
    registrationEnd:   new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
  },
  {
    name:        'Gran Final ValoTourneys Season 1',
    description: 'El torneo más importante de la temporada. Solo los mejores equipos clasificados.',
    gameMode:    'COMPETITIVE' as const,
    status:      'DRAFT' as const,
    minRank:     'PLATINUM_1' as const,
    maxRank:     'RADIANT' as const,
    maxTeams:    8,
    teamSize:    5,
    rules:       '• Solo equipos clasificados\n• Platino a Radiante\n• Mejor de 5 en todas las rondas\n• Transmisión en vivo',
    registrationStart: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    registrationEnd:   new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    startDate:         new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
  },
]

async function main() {
  console.log('🌱 Creando 10 torneos de prueba...\n')

  for (const t of tournaments) {
    const created = await prisma.tournament.create({
      data: { ...t, createdById: 'system' },
    })
    console.log(`✅ ${created.name} (${created.teamSize}v${created.teamSize} · ${created.status})`)
  }

  console.log('\n🎉 Listo! 10 torneos creados.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
