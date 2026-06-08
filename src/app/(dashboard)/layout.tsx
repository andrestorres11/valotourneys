import { UserButton } from '@clerk/nextjs'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Inicio',      icon: '🏠' },
  { href: '/profile',     label: 'Mi perfil',   icon: '👤' },
  { href: '/teams',       label: 'Equipos',     icon: '👥' },
  { href: '/free-agents', label: 'Free Agents', icon: '🔍' },
  { href: '/tournaments', label: 'Torneos',     icon: '🏆' },
  { href: '/alioth',      label: 'Alioth IA',   icon: '🤖' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-valo-darker flex">
      {/* SIDEBAR */}
      <aside className="w-60 bg-valo-dark border-r border-valo-border flex flex-col fixed h-full z-10">
        <div className="px-6 py-5 border-b border-valo-border">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-valo-red font-black text-lg tracking-tight">VALO</span>
            <span className="text-white font-bold text-lg tracking-tight">TOURNEYS</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-valo-text hover:text-white hover:bg-valo-card transition-all text-sm"
            >
              <span className="text-base w-5">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="px-3 pt-4 pb-1">
                <p className="text-xs uppercase tracking-widest" style={{color:'rgba(172,179,188,0.4)'}}>Admin</p>
              </div>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded transition-all text-sm"
                style={{color:'rgba(255,70,85,0.8)'}}
              >
                <span className="text-base w-5">⚙️</span>
                Panel Admin
              </Link>
              <Link
                  href="/admin/players"
                  className="flex items-center gap-3 px-3 py-2.5 rounded transition-all text-sm"
                  style={{color:'rgba(255,70,85,0.6)'}}
                >
                  <span className="text-base w-5">👥</span>
                  Jugadores
              </Link>
            </>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-valo-border flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="min-w-0">
            <p className="text-white text-sm truncate">{user?.username ?? 'Usuario'}</p>
            {isAdmin && <p className="text-xs" style={{color:'#FF4655'}}>Admin</p>}
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-60 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
