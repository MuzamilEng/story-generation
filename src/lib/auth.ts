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
          name: user.full_name,
          role: user.role || 'USER',
          image: user.avatar_url,
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
      }

      // ✅ Update token from database on subsequent requests
      if (token.email && !user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string }
          })

          if (dbUser) {
            token.role = dbUser.role || 'USER'
            token.id = dbUser.id
            token.plan = dbUser.plan || 'free'
          }
        } catch (error) {
          console.error('[AUTH] Error fetching user for JWT:', error)
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
      }

      console.log('[AUTH] Session created for:', session.user?.email, 'Role:', session.user?.role, 'Plan:', session.user?.plan)
      return session
    },

    async signIn({ user, account, profile }) {
      console.log('[AUTH] SignIn attempt:', user.email, 'Provider:', account?.provider)
      return true
    },

    // ✅ FIXED: Handle both absolute and relative URLs
    async redirect({ url, baseUrl }) {
      console.log('[AUTH] Redirect callback:', { url, baseUrl })

      // Handle relative URLs
      if (url.startsWith('/')) {
        // Check if it's a signin page with callbackUrl parameter
        if (url.includes('/auth/signin')) {
          try {
            // Parse the URL properly
            let callbackUrl = ''
            if (url.includes('?')) {
              const params = new URLSearchParams(url.split('?')[1])
              callbackUrl = params.get('callbackUrl') || ''
            }

            if (callbackUrl) {
              // Ensure callbackUrl is properly formatted
              return `${baseUrl}${callbackUrl.startsWith('/') ? callbackUrl : '/' + callbackUrl}`
            }
          } catch (error) {
            console.error('[AUTH] Error parsing callbackUrl:', error)
          }
        }

        // Default: prepend baseUrl to relative URL
        return `${baseUrl}${url}`
      }

      // Handle absolute URLs
      else if (url.startsWith('http')) {
        return url
      }

      // Default fallback
      return baseUrl
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    newUser: '/auth/signup'
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
