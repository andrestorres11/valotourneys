'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AliothPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy Alioth, tu coach de IA para Valorant. Puedo analizar tus stats, darte consejos para mejorar, o prepararte para tu próximo torneo. ¿En qué te puedo ayudar hoy?',
    },
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Hubo un error. Intenta de nuevo.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const SUGGESTIONS = [
    '¿Cómo puedo mejorar mi headshot%?',
    'Analiza mis stats y dime en qué fallar menos',
    '¿Qué agentes me recomiendas para subir de rango?',
    'Estrategias para clutchear situaciones 1v3',
  ]

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-6rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-valo-border">
        <div className="w-10 h-10 rounded-full bg-valo-red/20 border border-valo-red/40 flex items-center justify-center text-lg">
          🤖
        </div>
        <div>
          <h1 className="text-white font-bold">Alioth</h1>
          <p className="text-valo-text text-xs">Coach de IA · Siempre disponible</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs">En línea</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-valo-red/20 border border-valo-red/40 flex items-center justify-center text-sm shrink-0 mt-0.5">
                🤖
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-valo-red/90 text-white rounded-tr-none'
                  : 'bg-valo-card border border-valo-border text-white rounded-tl-none'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-valo-red/20 border border-valo-red/40 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <div className="bg-valo-card border border-valo-border px-4 py-3 rounded-lg rounded-tl-none">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-valo-text animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="flex gap-2 flex-wrap py-3">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 bg-valo-card border border-valo-border text-valo-text rounded-full hover:text-white hover:border-valo-red/40 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-4 border-t border-valo-border">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Pregúntale algo a Alioth... (Enter para enviar)"
          rows={1}
          disabled={loading}
          className="flex-1 bg-valo-card border border-valo-border rounded-lg px-4 py-2.5 text-white text-sm placeholder-valo-text/50 focus:outline-none focus:border-valo-red/50 resize-none disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-valo-red text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-valo-red/90 disabled:opacity-40 transition-all"
        >
          →
        </button>
      </div>
    </div>
  )
}
