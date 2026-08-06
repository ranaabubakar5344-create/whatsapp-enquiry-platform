import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "./lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "Email and Password",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const email = parsedCredentials.data.email.toLowerCase().trim();
        const password = parsedCredentials.data.password;

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
          include: {
            company: true,
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        if (user.company && !user.company.isActive) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        };
      },
    }),
  ],

callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = user.role;
      token.companyId = user.companyId;
    }

    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      session.user.id =
        typeof token.id === "string"
          ? token.id
          : token.sub ?? "";

      session.user.role =
        typeof token.role === "string"
          ? token.role
          : "AGENT";

      session.user.companyId =
        typeof token.companyId === "string"
          ? token.companyId
          : null;
    }

    return session;
  },
},
});