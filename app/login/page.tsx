import { redirect } from "next/navigation";

import { auth } from "@/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="absolute -bottom-36 -right-32 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative z-10 flex w-full justify-center">
        <LoginForm />
      </div>
    </main>
  );
}