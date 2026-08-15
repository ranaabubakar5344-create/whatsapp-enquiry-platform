"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  UserRound,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Conversation = {
  id: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  lastMessageAt: string;
  handoffRequestedAt: string | null;

  assignedTo: {
    id: string;
    name: string;
    availability: string;
  } | null;

  lead: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    courseInterested: string | null;
    country: string | null;
  } | null;

  latestMessage: {
    content: string;
    sender: string;
    createdAt: string;
  } | null;
};

type ChatsApiResponse = {
  success: boolean;
  error?: string;
  data?: {
    conversations: Conversation[];
  };
};

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

function displayPhone(phone: string | null): string {
  if (!phone || phone.startsWith("web:")) {
    return "Phone not provided";
  }

  return phone;
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

function statusLabel(status: string): string {
  switch (status) {
    case "WAITING_FOR_AGENT":
      return "Waiting";
    case "AGENT_ACTIVE":
      return "Active";
    case "RESOLVED":
      return "Resolved";
    default:
      return status.replaceAll("_", " ");
  }
}

function actionLabel(status: string): string {
  switch (status) {
    case "WAITING_FOR_AGENT":
      return "Open Enquiry";
    case "AGENT_ACTIVE":
      return "Continue Chat";
    case "RESOLVED":
      return "View Chat";
    default:
      return "Open Chat";
  }
}

function buildSignature(conversations: Conversation[]): string {
  return conversations
    .map((conversation) =>
      [
        conversation.id,
        conversation.status,
        conversation.lastMessageAt,
        conversation.assignedTo?.id ?? "",
        conversation.customerName ?? "",
        conversation.customerPhone ?? "",
        conversation.customerEmail ?? "",
        conversation.lead?.courseInterested ?? "",
        conversation.latestMessage?.createdAt ?? "",
        conversation.latestMessage?.content ?? "",
      ].join("|")
    )
    .join("::");
}

function ConversationCard({
  conversation,
}: {
  conversation: Conversation;
}) {
  const customerName =
    conversation.customerName?.trim() ||
    conversation.lead?.name?.trim() ||
    "New Customer";

  const customerPhone =
    conversation.customerPhone &&
    !conversation.customerPhone.startsWith("web:")
      ? conversation.customerPhone
      : conversation.lead?.phone ?? null;

  const customerEmail =
    conversation.customerEmail ??
    conversation.lead?.email ??
    null;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-base font-bold text-emerald-700">
              {customerName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-950">
                {customerName}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {formatDate(
                  conversation.handoffRequestedAt ??
                    conversation.lastMessageAt
                )}
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${statusClasses(
              conversation.status
            )}`}
          >
            {statusLabel(conversation.status)}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">
              {displayPhone(customerPhone)}
            </span>
          </div>

          {customerEmail && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">
                {customerEmail}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MessageCircle className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">
              {conversation.lead?.courseInterested ??
                "Programme not selected"}
            </span>
          </div>

          {conversation.lead?.country && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">
                {conversation.lead.country}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="line-clamp-2 text-sm leading-6 text-slate-600">
            {conversation.latestMessage?.content ??
              "No messages available."}
          </p>
        </div>

        {conversation.assignedTo && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Users className="h-4 w-4" />
            <span>
              Assigned to{" "}
              <strong className="text-slate-700">
                {conversation.assignedTo.name}
              </strong>
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 p-4">
        <Link
          href={`/dashboard/chats/${conversation.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          {actionLabel(conversation.status)}
        </Link>
      </div>
    </article>
  );
}

export default function ChatsClient() {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestInFlightRef = useRef(false);
  const signatureRef = useRef("");

  const loadChats = useCallback(
    async (showRefreshState = false) => {
      if (
        requestInFlightRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      requestInFlightRef.current = true;

      if (showRefreshState) {
        setRefreshing(true);
      }

      try {
        const response = await fetch(
          "/api/dashboard/chats",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const contentType =
          response.headers.get("content-type") ?? "";

        if (
          !contentType
            .toLowerCase()
            .includes("application/json")
        ) {
          return;
        }

        const result =
          (await response.json()) as ChatsApiResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data ||
          !Array.isArray(result.data.conversations)
        ) {
          throw new Error(
            result.error ??
              "Live chats could not be loaded."
          );
        }

        const nextConversations =
          result.data.conversations;

        const nextSignature =
          buildSignature(nextConversations);

        if (
          signatureRef.current !== nextSignature
        ) {
          signatureRef.current = nextSignature;
          setConversations(nextConversations);
        }

        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Live chats could not be loaded."
        );
      } finally {
        requestInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadChats(false);
      }
    };

    void loadChats(false);

    const interval = window.setInterval(
      refresh,
      5000
    );

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        refresh
      );

      window.removeEventListener(
        "focus",
        refresh
      );
    };
  }, [loadChats]);

  const waitingChats = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.status ===
          "WAITING_FOR_AGENT"
      ),
    [conversations]
  );

  const activeChats = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.status ===
          "AGENT_ACTIVE"
      ),
    [conversations]
  );

  const resolvedChats = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.status === "RESOLVED"
      ),
    [conversations]
  );

  return (
    <main className="px-5 py-8 sm:px-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Customer Support
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Live Chats
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View waiting enquiries, active chats and
            resolved conversations.
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void loadChats(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Waiting
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-950">
                {waitingChats.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
              <Clock3 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Active
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-950">
                {activeChats.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
              <MessageCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Resolved
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-950">
                {resolvedChats.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="mt-10 grid gap-5 xl:grid-cols-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white"
            />
          ))}
        </section>
      ) : (
        <>
          <section className="mt-10">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Waiting for assistance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Customers who requested a Marketing Executive.
              </p>
            </div>

            {waitingChats.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />

                <p className="mt-4 font-bold text-slate-900">
                  No customers are waiting
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  New enquiries will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {waitingChats.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                  />
                ))}
              </div>
            )}
          </section>

          {activeChats.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-slate-950">
                Active chats
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Conversations currently handled by the team.
              </p>

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {activeChats.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                  />
                ))}
              </div>
            </section>
          )}

          {resolvedChats.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-slate-950">
                Recently resolved
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Completed customer conversations.
              </p>

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {resolvedChats
                  .slice(0, 10)
                  .map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                    />
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}