import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: { signIn: '/sign-in' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.userId as string
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
