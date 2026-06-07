# 🚀 Guía completa de instalación y despliegue — ValoTourneys

## ¿Dónde vivirán los datos?

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   Tu código  ──►  Vercel  ──►  Responde al      │
│   (GitHub)         ↕         usuario            │
│               Neon DB                           │
│           (PostgreSQL gratis)                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Vercel** = el servidor que ejecuta tu app Next.js (gratuito)
- **Neon** = la base de datos PostgreSQL (gratuito hasta 3GB)
- **Clerk** = el sistema de login (gratuito hasta 10k usuarios)
- **Cloudinary** = almacenamiento de fotos (gratuito 25GB)
- **Groq** = la IA Alioth (gratuito con límite generoso)

---

## PASO 1 — Clonar e instalar

```bash
# 1. Sube el proyecto a GitHub primero
git init
git add .
git commit -m "Initial commit: ValoTourneys"
git remote add origin https://github.com/TU_USUARIO/valotourneys.git
git push -u origin main

# 2. Instalar dependencias localmente para desarrollo
npm install
```

---

## PASO 2 — Configurar Neon (Base de datos)

1. Ve a https://console.neon.tech
2. Crea una cuenta gratis (puedes con Google)
3. Haz clic en **"New Project"**
4. Nombre del proyecto: `valotourneys`
5. Region: **US East** (más rápido con Vercel)
6. Haz clic en **"Create project"**

Luego:
7. En el panel, haz clic en **"Connection string"**
8. Selecciona **"Prisma"** en el dropdown de framework
9. Copia la URL, que se ve así:
   ```
   postgresql://usuario:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
10. Pégala en tu `.env` como `DATABASE_URL`

---

## PASO 3 — Configurar Clerk (Autenticación)

1. Ve a https://clerk.com → **"Start for free"**
2. Crea una aplicación → nombre: `ValoTourneys`
3. Selecciona métodos de login: **Email + Google** (recomendado)
4. Ve a **API Keys** en el panel izquierdo
5. Copia:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → empieza con `pk_test_`
   - `CLERK_SECRET_KEY` → empieza con `sk_test_`
6. Pégalas en tu `.env`

---

## PASO 4 — Configurar Henrik Dev API

1. Ve a https://docs.henrikdev.xyz/
2. Haz clic en **"Get API Key"** (necesitas Discord)
3. Copia la key → empieza con `HDEV-`
4. Pégala en `.env` como `HENRIK_API_KEY`

---

## PASO 5 — Configurar Groq (IA Alioth)

1. Ve a https://console.groq.com
2. Crea cuenta gratis
3. Ve a **"API Keys"** → **"Create API Key"**
4. Copia la key → empieza con `gsk_`
5. Pégala en `.env` como `GROQ_API_KEY`

---

## PASO 6 — Crear archivo .env local

Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```

Rellena TODOS los valores. El `.env` nunca va al repositorio (está en .gitignore).

---

## PASO 7 — Inicializar la base de datos

```bash
# 1. Generar el cliente de Prisma
npm run db:generate

# 2. Crear las tablas en Neon
npm run db:push

# Verás algo como:
# ✓ Generated Prisma Client
# ✓ The database is now in sync with your schema.

# 3. (Opcional) Crear datos de prueba
npm run db:seed

# 4. Ver tus datos en el navegador
npm run db:studio
```

---

## PASO 8 — Probar en local

```bash
npm run dev
```

Abre http://localhost:3000 — deberías ver la landing page.

Prueba el flujo completo:
1. Registrarte con Clerk
2. Ir a `/profile` y vincular tu Riot ID
3. Crear un equipo en `/teams`
4. Ver torneos en `/tournaments`

---

## PASO 9 — Desplegar en Vercel (PRODUCCIÓN)

### Opción A — Vercel CLI (recomendado)

```bash
# Instalar Vercel CLI globalmente
npm install -g vercel

# Desplegar (primera vez)
vercel

# Sigue las preguntas:
# ✓ Set up and deploy? → Y
# ✓ Which scope? → Tu cuenta
# ✓ Link to existing project? → N
# ✓ Project name: → valotourneys
# ✓ Directory: → ./
# ✓ Override settings? → N

# Vercel detecta Next.js automáticamente ✅
```

### Opción B — Desde GitHub (más fácil a largo plazo)

1. Ve a https://vercel.com → **"Add New Project"**
2. Conecta tu GitHub y selecciona el repo `valotourneys`
3. Framework: **Next.js** (auto-detectado)
4. Haz clic en **"Deploy"**

### Configurar variables de entorno en Vercel

**IMPORTANTE:** Vercel no lee tu `.env` local. Debes agregar las variables manualmente:

1. En Vercel → tu proyecto → **"Settings"** → **"Environment Variables"**
2. Agrega CADA variable de tu `.env`:

```
DATABASE_URL                        = postgresql://...neon.tech/...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   = pk_live_...
CLERK_SECRET_KEY                    = sk_live_...
HENRIK_API_KEY                      = HDEV-...
GROQ_API_KEY                        = gsk_...
CLOUDINARY_CLOUD_NAME               = tu_cloud
CLOUDINARY_API_KEY                  = ...
CLOUDINARY_API_SECRET               = ...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   = tu_cloud
NEXT_PUBLIC_APP_URL                 = https://valotourneys.vercel.app
ADMIN_EMAIL                         = tu@email.com
```

3. Después de agregar las variables → **"Redeploy"**

### Re-inicializar la DB en producción

```bash
# Apunta a la DB de Neon (ya configurada en Vercel)
# Localmente, ejecuta con la DATABASE_URL de Neon:
npm run db:push
```

---

## PASO 10 — Configurar Clerk para producción

En Clerk dashboard:
1. Ve a **"Domains"**
2. Agrega tu dominio de Vercel: `valotourneys.vercel.app`
3. En **"API Keys"** cambia a **"Production keys"** (`pk_live_` en vez de `pk_test_`)
4. Actualiza las keys en Vercel

---

## Estructura de archivos generados

```
valotourneys/
├── prisma/
│   ├── schema.prisma      ← Modelo de datos completo
│   └── seed.ts            ← Datos de prueba
├── src/
│   ├── app/
│   │   ├── (dashboard)/   ← Páginas protegidas
│   │   │   ├── dashboard/ ← Home del usuario
│   │   │   ├── profile/   ← Perfil + sync Riot ID
│   │   │   ├── teams/     ← Equipos
│   │   │   └── tournaments/ ← Lista torneos
│   │   ├── api/
│   │   │   ├── players/   ← sync-riot, profile
│   │   │   ├── teams/     ← CRUD equipos
│   │   │   ├── tournaments/ ← CRUD + registro
│   │   │   ├── admin/     ← brackets, resultados
│   │   │   └── chat/      ← Alioth IA
│   │   ├── page.tsx       ← Landing pública
│   │   └── layout.tsx     ← Root layout + Clerk
│   ├── lib/
│   │   ├── prisma.ts      ← Cliente DB
│   │   ├── auth.ts        ← Helpers Clerk + DB
│   │   ├── henrik.ts      ← Cliente Henrik API
│   │   ├── groq.ts        ← Alioth IA
│   │   └── utils.ts       ← Utilidades generales
│   ├── types/index.ts     ← Tipos TypeScript + constantes
│   └── middleware.ts      ← Protección de rutas
├── .env.example           ← Plantilla de variables
├── .env                   ← TU config local (no subir a git)
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Flujo de datos completo

```
Usuario se registra
    ↓
Clerk crea usuario → webhook/middleware → Prisma crea User+Player en Neon
    ↓
Usuario vincula Riot ID
    ↓
Next.js API Route → Henrik Dev API → stats del jugador → guardados en Neon
    ↓
Usuario crea equipo → Neon guarda Team + TeamMember
    ↓
Admin crea torneo → Neon guarda Tournament
    ↓
Capitán inscribe equipo → validación de rangos via Neon → TournamentRegistration
    ↓
Admin genera bracket → Neon crea Phase + Groups/Matches
    ↓
Admin registra resultados → Neon actualiza Match + GroupStanding
    ↓
Jugadores consultan Alioth → Groq LLM → análisis personalizado
```

---

## Comandos de referencia rápida

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run db:push      # Sincronizar schema → DB
npm run db:generate  # Regenerar cliente Prisma
npm run db:studio    # GUI visual de la DB
npm run db:seed      # Datos de prueba
vercel               # Desplegar a producción
vercel --prod        # Desplegar a producción (forzar)
```

---

## Módulos pendientes de implementar (próximos pasos)

Los siguientes módulos tienen sus rutas API listas — falta construir la UI:

1. **`/teams`** — Lista y creación de equipos
2. **`/free-agents`** — Pool de jugadores sin equipo
3. **`/tournaments/[id]`** — Detalle de torneo con bracket visual
4. **`/admin`** — Panel de administración
5. **Chat Alioth** — Componente de chat con streaming
6. **Upload de fotos** — Integración Cloudinary

Dile a Claude qué módulo quieres construir primero y te genera el código completo.
