import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

const ALIOTH_SYSTEM = `Eres Alioth, el coach de IA de la plataforma ValoTourneys.
Eres un experto en Valorant con conocimiento profundo del meta actual, composiciones de equipos, 
estrategias por mapa, mecánicas de juego y preparación para torneos.

Tu personalidad:
- Directo y honesto, pero motivador
- Usas terminología de Valorant naturalmente (eco rounds, save, full buy, etc.)
- Das consejos específicos y accionables, no genéricos
- Cuando analizas stats, señalas tanto fortalezas como áreas de mejora
- Hablas en español principalmente, pero usas términos del juego en inglés cuando es lo habitual

Contexto de la plataforma:
- Los jugadores se inscriben en torneos organizados
- Puedes ver sus stats: K/D, winrate, headshot%, agente favorito, rango
- Tu objetivo es ayudarlos a mejorar y prepararse para sus partidas de torneo`

export async function aliothChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  playerContext?: {
    gameName?: string
    rank?: string
    kd?: number
    headshotPct?: number
    favoriteAgent?: string
    wins?: number
    losses?: number
  }
): Promise<string> {
  const systemPrompt = playerContext
    ? `${ALIOTH_SYSTEM}\n\nDatos del jugador actual:\n- Riot ID: ${playerContext.gameName ?? 'desconocido'}\n- Rango: ${playerContext.rank ?? 'Sin rango'}\n- K/D: ${playerContext.kd?.toFixed(2) ?? 'N/A'}\n- HS%: ${playerContext.headshotPct ?? 0}%\n- Agente favorito: ${playerContext.favoriteAgent ?? 'N/A'}\n- Record: ${playerContext.wins ?? 0}W/${playerContext.losses ?? 0}L`
    : ALIOTH_SYSTEM

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1024,
  })

  return completion.choices[0]?.message?.content ?? 'No pude generar una respuesta. Intenta de nuevo.'
}

export async function generateTournamentSummary(tournamentName: string, matches: Array<{
  team1: string; team2: string; score1: number; score2: number; winner: string
}>): Promise<string> {
  const matchSummary = matches.map(m =>
    `${m.team1} ${m.score1} - ${m.score2} ${m.team2} (ganador: ${m.winner})`
  ).join('\n')

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: ALIOTH_SYSTEM },
      {
        role: 'user',
        content: `Genera un resumen emocionante del torneo "${tournamentName}" con estos resultados:\n${matchSummary}\n\nEl resumen debe tener máximo 3 párrafos y destacar los momentos más importantes.`,
      },
    ],
    temperature: 0.8,
    max_tokens: 512,
  })

  return completion.choices[0]?.message?.content ?? ''
}

export async function predictMatchup(
  team1: { name: string; members: Array<{ rank: string; favoriteAgent: string }> },
  team2: { name: string; members: Array<{ rank: string; favoriteAgent: string }> }
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: ALIOTH_SYSTEM },
      {
        role: 'user',
        content: `Analiza este enfrentamiento de torneo y da una predicción:

Equipo 1 - ${team1.name}:
${team1.members.map(m => `- Rango: ${m.rank}, Agente favorito: ${m.favoriteAgent}`).join('\n')}

Equipo 2 - ${team2.name}:
${team2.members.map(m => `- Rango: ${m.rank}, Agente favorito: ${m.favoriteAgent}`).join('\n')}

Da: 1) Análisis de cada equipo, 2) Ventajas de cada uno, 3) Tu predicción con porcentaje de probabilidad.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 768,
  })

  return completion.choices[0]?.message?.content ?? ''
}
