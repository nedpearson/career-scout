import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/password";
import { ensureDemoSeed, getOrCreateDemoUser } from "@/lib/auth/demo";

const adapter = PrismaAdapter(prisma);

const providers = [
  Credentials({
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      remember: { label: "Remember me", type: "text" },
      demo: { label: "Demo", type: "text" }
    },
    async authorize(credentials) {
      const remember = (credentials?.remember ?? "").toString() === "on";
      const demo = (credentials?.demo ?? "").toString() === "on";

      if (demo) {
        if (env.ALLOW_DEMO_LOGIN !== "true") return null;
        const user = await getOrCreateDemoUser(prisma);
        // Seed only if empty so you can modify demo data later.
        await ensureDemoSeed(prisma, user.id);
        // Persist preference so createSession reads it reliably.
        if (user.rememberMe !== true) {
          await prisma.user.update({ where: { id: user.id }, data: { rememberMe: true } });
        }
        return user;
      }

      const email = (credentials?.email ?? "").toString().trim().toLowerCase();
      const password = (credentials?.password ?? "").toString();
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const ok = verifyPassword(password, user.passwordHash);
      if (!ok) return null;

      // Persist remember-me preference for this login so the adapter can read it.
      if (user.rememberMe !== remember) {
        await prisma.user.update({
          where: { id: user.id },
          data: { rememberMe: remember }
        });
      }

      return user;
    }
  })
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  // Read directly from process.env so `next build` doesn't fail if the build
  // environment withholds secrets. Auth.js will still require a real secret at runtime.
  secret: process.env.JOBTRACKER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  // Credentials provider requires JWT sessions in Auth.js / NextAuth v5.
  session: {
    strategy: "jwt",
    // Default to "remember me" length; we shorten per-login via token.exp when rememberMe is false.
    maxAge: 30 * 24 * 60 * 60
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60
  },
  pages: {
    signIn: "/signin"
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, persist user id (and rememberMe choice) into the token.
      if (user) {
        const rememberMe = (user as unknown as { rememberMe?: boolean }).rememberMe !== false;
        (token as unknown as { id?: string; rememberMe?: boolean }).id = user.id;
        (token as unknown as { rememberMe?: boolean }).rememberMe = rememberMe;

        // Enforce per-login expiry:
        // - rememberMe: 30 days
        // - not remembered: 12 hours
        const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
        token.exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
      }

      return token;
    },
    session({ session, token }) {
      // Make userId available in server routes.
      const id = (token as unknown as { id?: string }).id ?? token.sub;
      if (session.user && id) (session.user as unknown as { id: string }).id = id;

      // Keep session.expires aligned with token expiry when present.
      if (typeof token.exp === "number") {
        session.expires = new Date(token.exp * 1000).toISOString();
      }
      return session;
    }
  }
});
