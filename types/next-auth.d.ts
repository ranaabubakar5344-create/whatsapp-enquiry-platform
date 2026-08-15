import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    companyId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      companyId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    companyId?: string | null;
  }
}

declare module "next-auth/reat" {
  interface Session {
    useer : {
      id :  string;
      role : string;
      companyId : string  | null;
    } & DefaultSession["user"];
    }
  }

   declare module "next-auth/jwt" {
 interface JWT {
  id ? : string;
  role ? : string;
 companyId ? : string | null ;
 
 } }
  //new module for next-auth/reat
   
      declare module "next-auth/reat" {
        interface Session {
          user: {
            id: string;
            role:string;
            companyId: string | null;
          } & DefaultSession["user"]
        }

   }
   
export {};