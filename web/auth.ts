import NextAuth from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import { decodeJwtExpiryMs } from '@/lib/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    userType: 'STAFF' | 'GUARDIAN' | 'STUDENT';
    roles: string[];
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/** Refresh-token rotation, mirrored from the API side (see api/.../auth.service.ts). */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    if (!res.ok) {
      throw new Error(`Refresh failed with status ${res.status}`);
    }
    const data = (await res.json()) as RefreshResponse;
    return {
      ...token,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpiresAt:
        decodeJwtExpiryMs(data.accessToken) ?? Date.now() + 15 * 60 * 1000,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }

        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          return null;
        }

        const data = (await res.json()) as LoginResponse;
        return {
          id: data.user.id,
          email: data.user.email,
          name: `${data.user.firstName} ${data.user.lastName}`,
          userType: data.user.userType,
          roles: data.user.roles,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpiresAt:
            decodeJwtExpiryMs(data.accessToken) ?? Date.now() + 15 * 60 * 1000,
        } as never; // next-auth's User type is widened via types/next-auth.d.ts
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        // Initial sign-in: `user` is exactly what `authorize` returned above.
        return {
          ...token,
          id: user.id as string,
          userType: user.userType,
          roles: user.roles,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpiresAt: user.accessTokenExpiresAt,
        };
      }

      // 60s buffer so we refresh slightly before the access token actually
      // expires, rather than racing a request against the exact expiry.
      if (token.accessTokenExpiresAt && Date.now() < token.accessTokenExpiresAt - 60_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    session: async ({ session, token }) => {
      session.user.id = token.id;
      session.user.userType = token.userType;
      session.user.roles = token.roles;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});
