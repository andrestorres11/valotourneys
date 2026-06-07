import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Inicio',    icon: '🏠' },
  { href: '/profile',       label: 'Mi perfil', icon: '👤' },
  { href: '/teams',         label: 'Equipos',   icon: '👥' },
  { href: '/tournaments',   label: 'Torneos',   icon: '🏆' },
  { href: '/free-agents',   label: 'Free Agents', icon: '🔍' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-valo-darker flex">
      {/* SIDEBAR */}
      <aside className="w-60 bg-valo-dark border-r border-valo-border flex flex-col fixed h-full">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-valo-border">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-valo-red font-black text-lg tracking-tight">VALO</span>
            <span className="text-white font-bold text-lg tracking-tight">TOURNEYS</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-valo-text hover:text-white hover:bg-valo-card transition-all text-sm group"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-valo-border flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <span className="text-valo-text text-sm">Mi cuenta</span>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  )
}
