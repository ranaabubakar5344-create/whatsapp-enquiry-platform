import { redirect } from "next/navigation";

import { auth } from "@/auth";

import ChatsClient from "./ChatsClient";

export const dynamic = "force-dynamic";

export default async function ChatsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.companyId) {
    return (
      <main className="p-8">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-bold text-amber-900">
            Company not assigned
          </h1>

          <p className="mt-2 text-sm text-amber-700">
            Your account must be connected to a company
            before chats can be viewed.
          </p>
        </div>
      </main>
    );
  }

  return <ChatsClient />;
}