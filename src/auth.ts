import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from "@/src/db/schema";
import { marketplaceAccounts, userRoles } from "@/src/db/schema/marketplace";
import {
  configuredAuthProviders,
  getServerEnv,
  isAuthDevLoginEnabled,
} from "@/src/validation/env";
import type { ApprovalState } from "@/src/domain/approval";
import type { MarketplaceRole } from "@/src/domain/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isPlatformStaff: boolean;
      approvalState: ApprovalState | null;
      roles: MarketplaceRole[];
    };
  }

  interface User {
    isPlatformStaff?: boolean;
  }
}

async function loadMarketplaceSessionFields(userId: string) {
  if (!process.env.DATABASE_URL) {
    return {
      isPlatformStaff: false,
      approvalState: null as ApprovalState | null,
      roles: [] as MarketplaceRole[],
    };
  }

  const db = getDb();
  const [user, account, roles] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.marketplaceAccounts.findFirst({
      where: eq(marketplaceAccounts.userId, userId),
    }),
    db.query.userRoles.findMany({
      where: eq(userRoles.userId, userId),
    }),
  ]);

  return {
    isPlatformStaff: Boolean(user?.isPlatformStaff),
    approvalState:
      (account?.approvalState as ApprovalState | undefined) ?? null,
    roles: roles.map((role) => role.role as MarketplaceRole),
  };
}

function buildProviders() {
  const env = getServerEnv();
  const providers = [];

  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: env.AUTH_GITHUB_ID,
        clientSecret: env.AUTH_GITHUB_SECRET,
      }),
    );
  }

  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      }),
    );
  }

  if (isAuthDevLoginEnabled()) {
    providers.push(
      Credentials({
        id: "dev-login",
        name: "Development login",
        credentials: {
          email: { label: "Email", type: "email" },
          name: { label: "Name", type: "text" },
          staff: { label: "Staff", type: "text" },
        },
        async authorize(credentials) {
          if (!isAuthDevLoginEnabled() || !process.env.DATABASE_URL) {
            return null;
          }

          const email =
            typeof credentials?.email === "string" &&
            credentials.email.includes("@")
              ? credentials.email.toLowerCase().trim()
              : "dev@salon.local";
          const name =
            typeof credentials?.name === "string" && credentials.name.trim()
              ? credentials.name.trim()
              : "Salon Dev User";
          const isStaff = credentials?.staff === "true";

          const db = getDb();
          const existing = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (existing) {
            if (
              existing.isPlatformStaff !== isStaff ||
              existing.name !== name
            ) {
              await db
                .update(users)
                .set({
                  isPlatformStaff: isStaff,
                  name,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, existing.id));
            }
            return {
              id: existing.id,
              email: existing.email,
              name,
              isPlatformStaff: isStaff,
            };
          }

          const [created] = await db
            .insert(users)
            .values({
              email,
              name,
              emailVerified: new Date(),
              isPlatformStaff: isStaff,
            })
            .returning();

          if (!created) {
            return null;
          }

          return {
            id: created.id,
            email: created.email,
            name: created.name,
            isPlatformStaff: created.isPlatformStaff,
          };
        },
      }),
    );
  }

  return providers;
}

const databaseUrl = process.env.DATABASE_URL;
const useDevLogin = isAuthDevLoginEnabled();

/**
 * Database sessions are the default when Neon is configured and the credentials
 * development login is off. Auth.js requires JWT for the credentials provider.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(databaseUrl
    ? {
        adapter: DrizzleAdapter(getDb(), {
          usersTable: users,
          accountsTable: accounts,
          sessionsTable: sessions,
          verificationTokensTable: verificationTokens,
          authenticatorsTable: authenticators,
        }),
      }
    : {}),
  session: {
    strategy:
      databaseUrl && !useDevLogin ? ("database" as const) : ("jwt" as const),
  },
  trustHost:
    getServerEnv().AUTH_TRUST_HOST === "true" ||
    process.env.NODE_ENV !== "production",
  providers: buildProviders(),
  pages: {
    signIn: "/en/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (token.sub) {
        const fields = await loadMarketplaceSessionFields(token.sub);
        token.isPlatformStaff = fields.isPlatformStaff;
        token.approvalState = fields.approvalState;
        token.roles = fields.roles;
      }
      return token;
    },
    async session({ session, user, token }) {
      const userId = user?.id ?? token.sub;
      if (!userId) {
        return session;
      }

      const fields = user
        ? await loadMarketplaceSessionFields(user.id)
        : {
            isPlatformStaff: Boolean(token.isPlatformStaff),
            approvalState:
              (token.approvalState as ApprovalState | null) ?? null,
            roles: (token.roles as MarketplaceRole[] | undefined) ?? [],
          };

      session.user.id = userId;
      session.user.isPlatformStaff = fields.isPlatformStaff;
      session.user.approvalState = fields.approvalState;
      session.user.roles = fields.roles;
      return session;
    },
  },
});

export function listConfiguredProviders() {
  return configuredAuthProviders();
}
