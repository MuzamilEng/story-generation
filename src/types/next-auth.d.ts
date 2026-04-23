import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      plan?: string;
      isActive?: boolean;
      stripeCurrentPeriodEnd?: string | Date;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      isBetaUser?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    plan?: string;
    isActive?: boolean;
    stripeCurrentPeriodEnd?: string | Date | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    isBetaUser?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    plan?: string;
    isActive?: boolean;
    stripeCurrentPeriodEnd?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    lastDbRefresh?: number;
    isBetaUser?: boolean;
  }
}
