import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from "@/src/db/schema";
import { configuredAuthProviders, getServerEnv } from "@/src/validation/env";
import type { AccountStatus } from "@/src/domain/approval";
import type { MarketplaceRole } from "@/src/domain/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isPlatformStaff: boolean;
      accountStatus: AccountStatus | null;
      roles: MarketplaceRole[];
      entertainerVerified: boolean;
      venueVerified: boolean;
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
      accountStatus: null as AccountStatus | null,
      roles: [] as MarketplaceRole[],
      entertainerVerified: false,
      venueVerified: false,
    };
  }

  const { getActorContext } = await import("@/src/db/queries/actor");
  const actor = await getActorContext(userId);
  if (!actor) {
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return {
      isPlatformStaff: Boolean(user?.isPlatformStaff),
      accountStatus: null as AccountStatus | null,
      roles: [] as MarketplaceRole[],
      entertainerVerified: false,
      venueVerified: false,
    };
  }

  return {
    isPlatformStaff: actor.isPlatformStaff,
    accountStatus: actor.accountStatus,
    roles: [...actor.roles],
    entertainerVerified: actor.entertainerVerified,
    venueVerified: actor.venueVerified,
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

  return providers;
}

/**
 * Auth.js adapter that refuses to resurrect anonymized user shells.
 * If an OAuth account still points at an anonymized user, unlink it and return
 * null so Auth.js creates a fresh user for that identity.
 */
function createSalonAuthAdapter() {
  const db = getDb();
  const base = DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  });

  return {
    ...base,
    async getUserByAccount(
      providerAccountId: Parameters<
        NonNullable<typeof base.getUserByAccount>
      >[0],
    ) {
      const user = (await base.getUserByAccount?.(providerAccountId)) ?? null;
      if (!user?.id) {
        return null;
      }

      const row = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { anonymizedAt: true },
      });
      if (!row?.anonymizedAt) {
        return user;
      }

      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider, providerAccountId.provider),
            eq(accounts.providerAccountId, providerAccountId.providerAccountId),
          ),
        );
      await db.delete(sessions).where(eq(sessions.userId, user.id));
      return null;
    },
  };
}

const databaseUrl = process.env.DATABASE_URL;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Avoid the default `/api/auth/*` paths — Google Safe Browsing frequently
  // false-flags `/api/auth/signin` and `/api/auth/signin/google` as phishing.
  basePath: "/api/session",
  ...(databaseUrl
    ? {
        adapter: createSalonAuthAdapter(),
      }
    : {}),
  session: {
    strategy: databaseUrl ? ("database" as const) : ("jwt" as const),
  },
  trustHost: true,
  providers: buildProviders(),
  pages: {
    signIn: "/en/sign-in",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        if (new URL(url).origin === baseUrl) {
          return url;
        }
      } catch {
        // fall through
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (token.sub) {
        const fields = await loadMarketplaceSessionFields(token.sub);
        token.isPlatformStaff = fields.isPlatformStaff;
        token.accountStatus = fields.accountStatus;
        token.roles = fields.roles;
        token.entertainerVerified = fields.entertainerVerified;
        token.venueVerified = fields.venueVerified;
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
            accountStatus:
              (token.accountStatus as AccountStatus | null) ?? null,
            roles: (token.roles as MarketplaceRole[] | undefined) ?? [],
            entertainerVerified: Boolean(token.entertainerVerified),
            venueVerified: Boolean(token.venueVerified),
          };

      session.user.id = userId;
      session.user.image = user?.image ?? session.user.image ?? null;
      session.user.isPlatformStaff = fields.isPlatformStaff;
      session.user.accountStatus = fields.accountStatus;
      session.user.roles = fields.roles;
      session.user.entertainerVerified = fields.entertainerVerified;
      session.user.venueVerified = fields.venueVerified;
      return session;
    },
  },
});

export function listConfiguredProviders() {
  return configuredAuthProviders();
}
