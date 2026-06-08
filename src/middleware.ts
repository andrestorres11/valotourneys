import { withClerkMiddleware, getAuth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/', '/sign-in*', '/sign-up*', '/tournaments*', '/players*', '/api/tournaments*']

function isPublic(path: string) {
  return publicPaths.find(x =>
    x.endsWith('*')
      ? path.startsWith(x.slice(0, -1))
      : path === x
  )
}

export default withClerkMiddleware((req: NextRequest) => {
  if (isPublic(req.nextUrl.pathname)) return NextResponse.next()
  const { userId } = getAuth(req)
  if (!userId) {
    const signIn = new URL('/sign-in', req.url)
    signIn.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signIn)
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}