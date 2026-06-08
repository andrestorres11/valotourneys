import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import type { User, Player } from '@prisma/client'

export async function getCurrentUser(): Promise<(User & { player: Player | null }) | null> {
  const { userId } = auth()
  if (!userId) return null

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { player: true },
  })

  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    const username =
      clerkUser.username ??
      clerkUser.firstName ??
      email.split('@')[0] ??
      `user_${userId.slice(-6)}`

    const isAdmin = email === process.env.ADMIN_EMAIL

    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email,
        username,
        role: isAdmin ? 'ADMIN' : 'PLAYER',
        player: { create: {} },
      },
      include: { player: true },
    })
  }

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'ADMIN') throw new Error('Forbidden')
  return user
}