import Link from 'next/link'
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-valo-darker flex flex-col">
      {/* NAV */}
      <nav className="border-b border-valo-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-valo-red font-black text-xl tracking-tight">VALO</span>
          <span className="text-white font-bold text-xl tracking-tight">TOURNEYS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tournaments" className="text-valo-text hover:text-white text-sm transition-colors">
            Torneos
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm px-4 py-1.5 border border-valo-border rounded text-valo-text hover:text-white hover:border-white/40 transition-all">
                Iniciar sesión
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="text-sm px-4 py-1.5 bg-valo-red rounded text-white font-semibold hover:bg-valo-red/90 transition-all">
                Registrarse
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="text-sm px-4 py-1.5 bg-valo-red rounded text-white font-semibold hover:bg-valo-red/90 transition-all">
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-valo-red/10 border border-valo-red/30 rounded-full px-4 py-1.5 text-valo-red text-sm font-medium mb-8">
          🎮 Plataforma oficial de torneos
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-none tracking-tight">
          COMPITE.
          <br />
          <span className="text-valo-red">DOMINA.</span>
          <br />
          TRIUNFA.
        </h1>
        <p className="text-valo-text text-lg md:text-xl max-w-xl mb-12">
          Inscríbete en torneos, arma tu equipo, sube tu perfil verificado con tu rango real y compite con los mejores de Latinoamérica.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <SignUpButton mode="modal">
            <button className="px-8 py-3 bg-valo-red rounded font-bold text-white text-lg hover:bg-valo-red/90 transition-all animate-pulse-red">
              Empezar gratis →
            </button>
          </SignUpButton>
          <Link href="/tournaments" className="px-8 py-3 border border-valo-border rounded font-semibold text-white hover:border-white/40 transition-all">
            Ver torneos
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-6 px-6 pb-24 max-w-5xl mx-auto w-full">
        {[
          { icon: '🏆', title: 'Torneos oficiales', desc: 'Fases de grupos, brackets y eliminación directa con resultados en tiempo real.' },
          { icon: '👥', title: 'Arma tu equipo', desc: 'Busca jugadores por rol y rango, o únete al pool de agentes libres.' },
          { icon: '🤖', title: 'Alioth IA Coach', desc: 'Análisis personalizado de tus stats y predicciones de enfrentamientos.' },
        ].map(f => (
          <div key={f.title} className="valo-card p-6">
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-valo-text text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-valo-border py-6 text-center text-valo-text text-sm">
        ValoTourneys © 2024 — No afiliado con Riot Games
      </footer>
    </main>
  )
}
