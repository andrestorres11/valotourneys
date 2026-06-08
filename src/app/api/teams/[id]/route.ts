import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: "Sin perfil" }, { status: 400 })
    const team = await prisma.team.findUnique({ where: { id: params.id } })
    if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 })
    if (team.captainId !== user.player.id) return NextResponse.json({ error: "Solo el capitán puede editar" }, { status: 403 })
    const body = await req.json()
    const { description, logoBase64, logoMimeType } = body
    let logoUrl = team.logoUrl
    if (logoBase64 && logoMimeType) {
      const uploaded = await uploadToCloudinary(logoBase64, logoMimeType, "valotourneys/team-logos")
      logoUrl = uploaded.url
    }
    const updated = await prisma.team.update({
      where: { id: params.id },
      data: { description: description ?? team.description, logoUrl },
      include: { members: { include: { player: { include: { user: { select: { username: true } } } } } } },
    })
    return NextResponse.json(updated)
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === "Unauthorized") return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    return NextResponse.json({ error: error.message ?? "Error interno" }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: { members: { include: { player: { include: { user: { select: { username: true } } } } } } },
    })
    if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 })
    return NextResponse.json(team)
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    if (!user.player) return NextResponse.json({ error: "Sin perfil" }, { status: 400 })
    const team = await prisma.team.findUnique({ where: { id: params.id } })
    if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 })
    if (team.captainId !== user.player.id) return NextResponse.json({ error: "Solo el capitán puede disolver" }, { status: 403 })
    await prisma.team.update({ where: { id: params.id }, data: { status: "DISBANDED" } })
    await prisma.teamMember.deleteMany({ where: { teamId: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err as Error
    if (error.message === "Unauthorized") return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
