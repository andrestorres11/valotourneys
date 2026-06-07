import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProfileForm } from './ProfileForm'

export const metadata = { title: 'Mi perfil' }

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  return <ProfileForm player={user.player} username={user.username} />
}
