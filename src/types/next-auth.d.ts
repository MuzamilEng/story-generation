<<<<<<< HEAD
import { UserRole } from "@/lib/roles";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }

  interface User {
    id: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
=======
import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            plan?: string
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        id: string
        role: string
        plan?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        plan?: string
    }
>>>>>>> dd415b3 (intigrate ai)
}
