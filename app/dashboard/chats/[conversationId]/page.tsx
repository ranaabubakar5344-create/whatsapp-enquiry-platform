import { redirect } from "next/navigation";

import { auth } from "@/auth";
import ChatClient from "./ChatClient";

type ChatPageProps = {
  params: Promise<{
    conversationId: string;
  }>;
};

export default async function ChatPage({
  params,
}: ChatPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.companyId || !session.user.id) {
    redirect("/dashboard/chats");
  }

  const { conversationId } = await params;

  return (
    <ChatClient
      conversationId={conversationId}
      currentUser={{
        id: session.user.id,
        name: session.user.name ?? "Team Member",
        role: session.user.role,
      }}
    />
  );
}