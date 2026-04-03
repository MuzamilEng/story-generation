import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  // ✅ MUST include secret
  secret: process.env.NEXTAUTH_SECRET,

  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] No credentials provided')
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          console.log('[AUTH] User not found:', credentials.email)
          return null
        }

        if (!user.password_hash) {
          console.log('[AUTH] User has no password (OAuth user):', credentials.email)
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password_hash)

        if (!isPasswordValid) {
          console.log('[AUTH] Invalid password for:', credentials.email)
          return null
        }

        console.log('[AUTH] Login successful for:', user.email, 'Role:', user.role)

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'USER',
          image: user.image,
        }
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // ✅ Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role || 'USER'
        token.plan = (user as any).plan || 'free'
        token.email = user.email
        // Record when we last fetched fresh data from the DB so we can throttle
        // subsequent lookups. Without this, a DB query runs on every single API
        // request that calls getServerSession(), hammering the database and
        // risking silent stale/missing token.id on any transient DB error.
        token.lastDbRefresh = Math.floor(Date.now() / 1000)
      }

      // ✅ Refresh token from database at most once per minute on subsequent requests.
      // Previously this ran on every request, causing a DB hit per API call and
      // leaving token.id silently stale whenever the query failed.
      if (token.email && !user) {
        const now = Math.floor(Date.now() / 1000)
        const lastRefresh = (token.lastDbRefresh as number) || 0
        const shouldRefresh = now - lastRefresh > 60 // throttle to once per 60 s

        if (shouldRefresh) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              include: {
                betaCodes: {
                  where: { expiresAt: { gt: new Date() } },
                  take: 1
                }
              }
            } as any)

            if (dbUser) {
              const hasActiveBeta = (dbUser as any).betaCodes && (dbUser as any).betaCodes.length > 0;
              token.role = dbUser.role || 'USER'
              token.id = dbUser.id
              token.plan = dbUser.plan || 'free'
              token.isBetaUser = hasActiveBeta;
              token.stripeCurrentPeriodEnd = dbUser.stripeCurrentPeriodEnd ? dbUser.stripeCurrentPeriodEnd.toISOString() : undefined
              token.stripeSubscriptionId = dbUser.stripeSubscriptionId || undefined
              token.lastDbRefresh = now
            } else {
              token.id = undefined
            }
          } catch (error) {
            console.error('[AUTH] Error fetching user for JWT:', error)
            // Do NOT clear token.id on transient errors — keep the existing
            // value so one DB blip doesn't immediately break the session.
          }
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) || 'USER'
        session.user.plan = (token.plan as string) || 'free'
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.stripeCurrentPeriodEnd = token.stripeCurrentPeriodEnd as string
        session.user.stripeSubscriptionId = token.stripeSubscriptionId as string
        session.user.isBetaUser = token.isBetaUser as boolean
      }

      console.log('[AUTH] Session created for:', session.user?.email, 'Role:', session.user?.role, 'Plan:', session.user?.plan, 'Beta:', session.user?.isBetaUser)
      return session
    },

    async signIn({ user, account, profile }) {
      console.log('[AUTH] SignIn attempt:', user.email, 'Provider:', account?.provider)
      return true
    },

    // ✅ FIXED: Handle both absolute and relative URLs robustly
    async redirect({ url, baseUrl }) {
      console.log('[AUTH] Redirect callback:', { url, baseUrl })

      // If the URL is absolute and on the same origin, we can use it
      if (url.startsWith('http')) {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) {
          return url
        }
      }

      // If it's a relative URL, prepend the base URL
      if (url.startsWith('/')) {
        // Prevent double slashes
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        return `${base}${url}`
      }

      // Fallback
      return baseUrl
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    // newUser: '/auth/signup' // Let NextAuth handle this or redirect to dashboard
  },

  debug: process.env.NODE_ENV === 'development',

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
}
