"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  Send,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ChatMessage = {
  id: string;
  sender: "CUSTOMER" | "BOT" | "AGENT" | "SYSTEM";
  content: string;
  status: string;
  createdAt: string;
  senderUser: {
    id: string;
    name: string;
  } | null;
};

type ChatConversation = {
  id: string;
  status: string;
  currentStep: string;
  customerName: string | null;
  customerPhone: string;
  customerEmail: string | null;
  language: string;
  lastMessageAt: string;
  handoffRequestedAt: string | null;
  acceptedAt: string | null;
  resolvedAt: string | null;

  assignedAgent: {
    id: string;
    name: string;
    availability: string;
  } | null;

  lead: {
    id: string;
    courseInterested: string | null;
    country: string | null;
    source: string;
    priority: string;
  } | null;

  messages: ChatMessage[];
};

type ChatApiResponse = {
  success: boolean;
  error?: string;
  data?: {
    conversation: ChatConversation;
  };
};

type ChatClientProps = {
  conversationId: string;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
};

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function displayPhone(value: string): string {
  return value.startsWith("web:")
    ? "Phone not provided"
    : value;
}

function statusLabel(status: string): string {
  switch (status) {
    case "WAITING_FOR_AGENT":
      return "Waiting";
    case "AGENT_ACTIVE":
      return "Active";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
    default:
      return status.replaceAll("_", " ");
  }
}

function statusClasses(status: string): string {
  switch (status) {
    case "WAITING_FOR_AGENT":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "AGENT_ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "RESOLVED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

export default function ChatClient({
  conversationId,
  currentUser,
}: ChatClientProps) {
  const [conversation, setConversation] =
    useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Prevent slow polling requests from overlapping and making the UI flicker.
  const requestInFlightRef = useRef(false);
  const isMutatingRef = useRef(false);
  const lastScrolledMessageIdRef = useRef<string | null>(null);

  const loadConversation = useCallback(
    async (showLoader = false) => {
      if (
        requestInFlightRef.current ||
        isMutatingRef.current
      ) {
        return;
      }

      requestInFlightRef.current = true;

      try {
        if (showLoader) {
          setLoading(true);
        }

        const response = await fetch(
          `/api/dashboard/chats/${encodeURIComponent(
            conversationId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result =
          (await response.json()) as ChatApiResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.error ??
              "Conversation could not be loaded."
          );
        }

        // A mutation may have started while this GET request was running.
        // Do not let an older polling response overwrite newer UI state.
        if (isMutatingRef.current) {
          return;
        }

        const nextConversation =
          result.data.conversation;

        setConversation((currentConversation) => {
          if (!currentConversation) {
            return nextConversation;
          }

          const currentLastMessage =
            currentConversation.messages[
              currentConversation.messages.length - 1
            ];

          const nextLastMessage =
            nextConversation.messages[
              nextConversation.messages.length - 1
            ];

          const hasMeaningfulChange =
            currentConversation.status !==
              nextConversation.status ||
            currentConversation.currentStep !==
              nextConversation.currentStep ||
            currentConversation.lastMessageAt !==
              nextConversation.lastMessageAt ||
            currentConversation.assignedAgent?.id !==
              nextConversation.assignedAgent?.id ||
            currentConversation.messages.length !==
              nextConversation.messages.length ||
            currentLastMessage?.id !==
              nextLastMessage?.id ||
            currentLastMessage?.status !==
              nextLastMessage?.status;

          return hasMeaningfulChange
            ? nextConversation
            : currentConversation;
        });

        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Conversation could not be loaded."
        );
      } finally {
        requestInFlightRef.current = false;

        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [conversationId]
  );

  useEffect(() => {
    void loadConversation(true);
  }, [loadConversation]);

  useEffect(() => {
    const refreshConversation = () => {
      if (
        document.visibilityState === "visible" &&
        !isMutatingRef.current
      ) {
        void loadConversation(false);
      }
    };

    const interval = window.setInterval(
      refreshConversation,
      5000
    );

    document.addEventListener(
      "visibilitychange",
      refreshConversation
    );

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        refreshConversation
      );
    };
  }, [loadConversation]);

  const latestMessageId =
    conversation?.messages[
      conversation.messages.length - 1
    ]?.id ?? null;

  useEffect(() => {
    if (
      !latestMessageId ||
      lastScrolledMessageIdRef.current ===
        latestMessageId
    ) {
      return;
    }

    const behavior =
      lastScrolledMessageIdRef.current === null
        ? "auto"
        : "smooth";

    lastScrolledMessageIdRef.current =
      latestMessageId;

    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
    }, 50);
  }, [latestMessageId]);

  const isAssignedToCurrentUser =
    conversation?.assignedAgent?.id === currentUser.id;

  const canSend =
    conversation?.status === "AGENT_ACTIVE" &&
    isAssignedToCurrentUser;

  const canResolve =
    conversation?.status === "AGENT_ACTIVE" &&
    (isAssignedToCurrentUser ||
      currentUser.role === "COMPANY_ADMIN" ||
      currentUser.role === "SUPER_ADMIN");

  const customerName =
    conversation?.customerName?.trim() ||
    "New Customer";

  const customerInitial = useMemo(
    () => customerName.charAt(0).toUpperCase() || "C",
    [customerName]
  );

  async function performAction(
    action: "join" | "resolve",
    loadingSetter: (value: boolean) => void
  ) {
    try {
      isMutatingRef.current = true;
      loadingSetter(true);
      setError(null);

      const response = await fetch(
        `/api/dashboard/chats/${encodeURIComponent(
          conversationId
        )}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const result =
        (await response.json()) as ChatApiResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ?? "Action could not be completed."
        );
      }

      setConversation(result.data.conversation);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Action could not be completed."
      );
    } finally {
      isMutatingRef.current = false;
      loadingSetter(false);
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (
      !cleanMessage ||
      !conversation ||
      !canSend ||
      sending
    ) {
      return;
    }

    const temporaryId = `temporary-${Date.now()}`;

    const optimisticMessage: ChatMessage = {
      id: temporaryId,
      sender: "AGENT",
      content: cleanMessage,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      senderUser: {
        id: currentUser.id,
        name: currentUser.name,
      },
    };

    isMutatingRef.current = true;
    setMessage("");
    setSending(true);
    setError(null);

    setConversation((current) =>
      current
        ? {
            ...current,
            messages: [
              ...current.messages,
              optimisticMessage,
            ],
          }
        : current
    );

    try {
      const response = await fetch(
        `/api/dashboard/chats/${encodeURIComponent(
          conversationId
        )}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            action: "send",
            message: cleanMessage,
          }),
        }
      );

      const result =
        (await response.json()) as ChatApiResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ?? "Message could not be sent."
        );
      }

      setConversation(result.data.conversation);
    } catch (sendError) {
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter(
                (item) => item.id !== temporaryId
              ),
            }
          : current
      );

      setMessage(cleanMessage);

      setError(
        sendError instanceof Error
          ? sendError.message
          : "Message could not be sent."
      );
    } finally {
      isMutatingRef.current = false;
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-10 w-56 rounded-xl bg-slate-200" />
          <div className="mt-6 h-[680px] rounded-3xl bg-white" />
        </div>
      </main>
    );
  }

  if (!conversation) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-xl font-bold text-red-900">
            Conversation unavailable
          </h1>
          <p className="mt-2 text-sm text-red-700">
            {error ?? "This conversation could not be found."}
          </p>
          <Link
            href="/dashboard/chats"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
          >
            Back to Live Chats
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard/chats"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Live Chats
            </Link>

            <div className="mt-3 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-950">
                {customerName}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClasses(
                  conversation.status
                )}`}
              >
                {statusLabel(conversation.status)}
              </span>
            </div>
          </div>

          {canResolve && (
            <button
              type="button"
              disabled={resolving}
              onClick={() =>
                void performAction("resolve", setResolving)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {resolving ? "Resolving..." : "Resolve Chat"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-[680px] flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 font-bold text-emerald-700">
                  {customerInitial}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">
                    {customerName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {conversation.assignedAgent
                      ? `Assigned to ${conversation.assignedAgent.name}`
                      : "Waiting for a team member"}
                  </p>
                </div>
              </div>

              {conversation.status ===
                "WAITING_FOR_AGENT" && (
                <button
                  type="button"
                  disabled={joining}
                  onClick={() =>
                    void performAction("join", setJoining)
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {joining ? "Joining..." : "Join Chat"}
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-5 sm:px-6">
              <div className="space-y-4">
                {conversation.messages.map((chatMessage) => {
                  const isCustomer =
                    chatMessage.sender === "CUSTOMER";
                  const isAgent =
                    chatMessage.sender === "AGENT";

                  const senderName = isAgent
                    ? chatMessage.senderUser?.name ??
                      conversation.assignedAgent?.name ??
                      "Marketing Executive"
                    : chatMessage.sender === "BOT"
                      ? "Chat Assistant"
                      : chatMessage.sender === "SYSTEM"
                        ? "System"
                        : customerName;

                  return (
                    <article
                      key={chatMessage.id}
                      className={`flex ${
                        isCustomer
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div className="max-w-[82%]">
                        <p
                          className={`mb-1 px-1 text-[11px] font-semibold text-slate-500 ${
                            isCustomer
                              ? "text-left"
                              : "text-right"
                          }`}
                        >
                          {senderName}
                        </p>

                        <div
                          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                            isCustomer
                              ? "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                              : chatMessage.sender === "SYSTEM"
                                ? "border border-slate-200 bg-slate-100 text-slate-600"
                                : "rounded-br-md bg-emerald-600 text-white shadow-sm"
                          }`}
                        >
                          {chatMessage.content}
                        </div>

                        <p
                          className={`mt-1 px-1 text-[10px] text-slate-400 ${
                            isCustomer
                              ? "text-left"
                              : "text-right"
                          }`}
                        >
                          {formatTime(chatMessage.createdAt)}
                          {chatMessage.status === "PENDING"
                            ? " · Sending"
                            : ""}
                        </p>
                      </div>
                    </article>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <footer className="border-t border-slate-200 bg-white p-4">
              {conversation.status ===
              "WAITING_FOR_AGENT" ? (
                <div className="rounded-2xl bg-amber-50 px-4 py-4 text-center">
                  <Clock3 className="mx-auto h-5 w-5 text-amber-600" />
                  <p className="mt-2 text-sm font-bold text-amber-900">
                    Customer is waiting
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Click Join Chat to start replying.
                  </p>
                </div>
              ) : conversation.status === "RESOLVED" ? (
                <div className="rounded-2xl bg-blue-50 px-4 py-4 text-center text-sm font-semibold text-blue-700">
                  This conversation has been resolved.
                </div>
              ) : !isAssignedToCurrentUser ? (
                <div className="rounded-2xl bg-slate-100 px-4 py-4 text-center text-sm font-semibold text-slate-600">
                  This chat is being handled by{" "}
                  {conversation.assignedAgent?.name ??
                    "another team member"}.
                </div>
              ) : (
                <form
                  onSubmit={handleSend}
                  className="flex items-end gap-3"
                >
                  <textarea
                    value={message}
                    rows={1}
                    maxLength={2000}
                    disabled={sending}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Type your reply..."
                    className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white"
                  />

                  <button
                    type="submit"
                    disabled={
                      sending || message.trim().length === 0
                    }
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              )}
            </footer>
          </section>

          <aside className="bg-white p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
              Customer Details
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {customerName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {displayPhone(conversation.customerPhone)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {conversation.customerEmail ??
                      "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Programme</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {conversation.lead?.courseInterested ??
                      "Not selected"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Enquiry Information
              </p>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Country</dt>
                  <dd className="text-right font-semibold text-slate-800">
                    {conversation.lead?.country ??
                      "Not provided"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Source</dt>
                  <dd className="text-right font-semibold text-slate-800">
                    {conversation.lead?.source ??
                      "Website Chat"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Priority</dt>
                  <dd className="text-right font-semibold text-slate-800">
                    {conversation.lead?.priority ?? "MEDIUM"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Requested</dt>
                  <dd className="text-right font-semibold text-slate-800">
                    {formatDate(
                      conversation.handoffRequestedAt ??
                        conversation.lastMessageAt
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
