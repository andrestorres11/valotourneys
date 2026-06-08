'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const RANKS = [
  'UNRANKED','IRON_1','IRON_2','IRON_3',
  'BRONZE_1','BRONZE_2','BRONZE_3',
  'SILVER_1','SILVER_2','SILVER_3',
  'GOLD_1','GOLD_2','GOLD_3',
  'PLATINUM_1','PLATINUM_2','PLATINUM_3',
  'DIAMOND_1','DIAMOND_2','DIAMOND_3',
  'ASCENDANT_1','ASCENDANT_2','ASCENDANT_3',
  'IMMORTAL_1','IMMORTAL_2','IMMORTAL_3','RADIANT',
]

const RANK_LABELS: Record<string, string> = {
  UNRANKED:'Sin rango', IRON_1:'Hierro 1', IRON_2:'Hierro 2', IRON_3:'Hierro 3',
  BRONZE_1:'Bronce 1', BRONZE_2:'Bronce 2', BRONZE_3:'Bronce 3',
  SILVER_1:'Plata 1', SILVER_2:'Plata 2', SILVER_3:'Plata 3',
  GOLD_1:'Oro 1', GOLD_2:'Oro 2', GOLD_3:'Oro 3',
  PLATINUM_1:'Platino 1', PLATINUM_2:'Platino 2', PLATINUM_3:'Platino 3',
  DIAMOND_1:'Diamante 1', DIAMOND_2:'Diamante 2', DIAMOND_3:'Diamante 3',
  ASCENDANT_1:'Ascendente 1', ASCENDANT_2:'Ascendente 2', ASCENDANT_3:'Ascendente 3',
  IMMORTAL_1:'Inmortal 1', IMMORTAL_2:'Inmortal 2', IMMORTAL_3:'Inmortal 3',
  RADIANT:'Radiante',
}

const MODES = [
  { value: 'COMPETITIVE', label: 'Competitivo' },
  { value: 'UNRATED',     label: 'Sin clasificar' },
  { value: 'SPIKE_RUSH',  label: 'Spike Rush' },
  { value: 'DEATHMATCH',  label: 'Deathmatch' },
]

export function CreateTournamentForm() {
  const router  = useRouter()
  const [open, setOpen]  = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', gameMode: 'COMPETITIVE',
    minRank: 'UNRANKED', maxRank: 'RADIANT',
    maxTeams: 16, teamSize: 5,
    rules: '',
    registrationStart: '', registrationEnd: '',
    startDate: '', endDate: '',
  })

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`✅ Torneo "${data.name}" creado como borrador`)
      setOpen(false)
      setForm({ name:'', description:'', gameMode:'COMPETITIVE', minRank:'UNRANKED', maxRank:'RADIANT', maxTeams:16, teamSize:5, rules:'', registrationStart:'', registrationEnd:'', startDate:'', endDate:'' })
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full bg-valo-darker border border-valo-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-valo-red/50'
  const lbl = 'text-valo-text text-xs uppercase tracking-wider block mb-1.5'

  return (
    <div>
      {success && <p className="text-green-400 text-sm mb-4">{success}</p>}

      {!open ? (
        <button onClick={() => setOpen(true)} className="border border-valo-red/50 text-valo-red px-6 py-2.5 rounded text-sm font-semibold hover:bg-valo-red/10 transition-all">
          + Nuevo torneo
        </button>
      ) : (
        <div className="valo-card p-6 space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Nombre del torneo *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ValoTourneys Open #2" className={inp} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Descripción</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inp + ' resize-none'} placeholder="Descripción del torneo..." />
            </div>
            <div>
              <label className={lbl}>Modalidad</label>
              <select value={form.gameMode} onChange={e => set('gameMode', e.target.value)} className={inp}>
                {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className={lbl}>Rango mínimo</label>
              <select value={form.minRank} onChange={e => set('minRank', e.target.value)} className={inp}>
                {RANKS.map(r => <option key={r} value={r}>{RANK_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Rango máximo</label>
              <select value={form.maxRank} onChange={e => set('maxRank', e.target.value)} className={inp}>
                {RANKS.map(r => <option key={r} value={r}>{RANK_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Máximo equipos</label>
              <input type="number" value={form.maxTeams} onChange={e => set('maxTeams', parseInt(e.target.value))} min={2} max={64} className={inp} />
            </div>
            <div>
              <label className={lbl}>Jugadores por equipo</label>
              <input type="number" value={form.teamSize} onChange={e => set('teamSize', parseInt(e.target.value))} min={1} max={10} className={inp} />
            </div>
            <div>
              <label className={lbl}>Inicio inscripciones</label>
              <input type="datetime-local" value={form.registrationStart} onChange={e => set('registrationStart', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Fin inscripciones</label>
              <input type="datetime-local" value={form.registrationEnd} onChange={e => set('registrationEnd', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Fecha inicio torneo</label>
              <input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Fecha fin torneo</label>
              <input type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inp} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Reglamento</label>
              <textarea value={form.rules} onChange={e => set('rules', e.target.value)} rows={4} className={inp + ' resize-none'} placeholder="• Reglas del torneo..." />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">❌ {error}</p>}

          <div className="flex gap-3">
            <button onClick={submit} disabled={saving} className="bg-valo-red text-white px-6 py-2 rounded text-sm font-semibold hover:bg-valo-red/90 disabled:opacity-50 transition-all">
              {saving ? 'Creando...' : 'Crear torneo'}
            </button>
            <button onClick={() => setOpen(false)} className="border border-valo-border text-valo-text px-4 py-2 rounded text-sm hover:text-white transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
