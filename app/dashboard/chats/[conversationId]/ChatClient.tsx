"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CalendarClock,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
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
  customerPhone: string | null;
  customerEmail: string | null;
  language: string;
  lastMessageAt: string;
  handoffRequestedAt: string | null;
  acceptedAt: string | null;
  resolvedAt: string | null;
  whatsappContactedAt: string | null;
  whatsappContactedBy: {
    id: string;
    name: string;
  } | null;
  followUpAt: string | null;
  followUpNote: string | null;
  followUpCreatedBy: {
    id: string;
    name: string;
  } | null;
  followUpCompletedAt: string | null;
  followUpCompletedBy: {
    id: string;
    name: string;
  } | null;

  assignedAgent: {
    id: string;
    name: string;
    availability: string;
  } | null;

  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
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

function displayPhone(value: string | null): string {
  if (!value || value.startsWith("web:")) {
    return "Phone not provided";
  }

  return value;
}

function getWhatsAppNumber(
  value: string | null
): string | null {
  if (!value || value.startsWith("web:")) {
    return null;
  }

  let digits = value.replace(/\D/g, "");

  // wa.me expects the international number without + or 00.
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return digits;
}

function getLocalDateTimeMinimum(): string {
  const date = new Date(Date.now() + 5 * 60_000);
  const offset = date.getTimezoneOffset();

  return new Date(
    date.getTime() - offset * 60_000
  )
    .toISOString()
    .slice(0, 16);
}

function isFollowUpDue(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() <= Date.now()
  );
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
  const [markingWhatsApp, setMarkingWhatsApp] =
    useState(false);
  const [savingFollowUp, setSavingFollowUp] =
    useState(false);
  const [completingFollowUp, setCompletingFollowUp] =
    useState(false);
  const [followUpAt, setFollowUpAt] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
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
            currentConversation.whatsappContactedAt !==
              nextConversation.whatsappContactedAt ||
            currentConversation.followUpAt !==
              nextConversation.followUpAt ||
            currentConversation.followUpCompletedAt !==
              nextConversation.followUpCompletedAt ||
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
    conversation?.lead?.name?.trim() ||
    "New Customer";

  const customerPhone =
    conversation?.customerPhone &&
    !conversation.customerPhone.startsWith("web:")
      ? conversation.customerPhone
      : conversation?.lead?.phone ?? null;

  const customerEmail =
    conversation?.customerEmail ??
    conversation?.lead?.email ??
    null;

  const whatsappNumber = getWhatsAppNumber(
    customerPhone
  );

  const whatsappMessage = useMemo(() => {
    const programme =
      conversation?.lead?.courseInterested?.trim();

    return [
      `Hello ${customerName},`,
      "",
      programme
        ? `Thank you for your enquiry regarding ${programme}.`
        : "Thank you for your enquiry.",
      "",
      "We received your request through our website.",
      "How may I assist you further?",
    ].join("\n");
  }, [
    conversation?.lead?.courseInterested,
    customerName,
  ]);

  const quickReplies = useMemo(() => {
    const programme =
      conversation?.lead?.courseInterested?.trim();

    return [
      {
        label: "Greeting",
        text: `Hello ${customerName}, thank you for your enquiry. How may I assist you today?`,
      },
      {
        label: "Programme",
        text: programme
          ? `Thank you for your interest in ${programme}. I can guide you with the programme details, fees and admission process.`
          : "Thank you for your enquiry. I can guide you with the programme details, fees and admission process.",
      },
      {
        label: "Documents",
        text: "Please share your academic documents so we can review your eligibility and guide you on the next step.",
      },
      {
        label: "Follow-up",
        text: `Hello ${customerName}, I am following up on your enquiry. Please let me know if you need any help with the application process.`,
      },
    ];
  }, [conversation?.lead?.courseInterested, customerName]);

  async function markWhatsAppContacted() {
    if (
      markingWhatsApp ||
      !conversation
    ) {
      return;
    }

    try {
      setMarkingWhatsApp(true);

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
            action: "whatsapp_contacted",
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
        return;
      }

      setConversation(
        result.data.conversation
      );
    } catch {
      // WhatsApp should still open even if CRM tracking
      // temporarily fails. The next click can retry.
    } finally {
      setMarkingWhatsApp(false);
    }
  }

  function openCustomerWhatsApp() {
    if (!whatsappNumber) {
      return;
    }

    const text = encodeURIComponent(
      whatsappMessage
    );

    /*
     * Open WhatsApp immediately from the user click so the
     * browser does not block it as a popup.
     */
    window.open(
      `https://wa.me/${whatsappNumber}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );

    void markWhatsAppContacted();
  }

  async function saveFollowUpReminder() {
    if (!conversation || savingFollowUp) {
      return;
    }

    if (!followUpAt) {
      setError("Choose a follow-up date and time.");
      return;
    }

    try {
      isMutatingRef.current = true;
      setSavingFollowUp(true);
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
          body: JSON.stringify({
            action: "set_follow_up",
            followUpAt: new Date(followUpAt).toISOString(),
            followUpNote: followUpNote.trim(),
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
          result.error ??
            "Follow-up reminder could not be saved."
        );
      }

      setConversation(result.data.conversation);
      setFollowUpAt("");
      setFollowUpNote("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Follow-up reminder could not be saved."
      );
    } finally {
      isMutatingRef.current = false;
      setSavingFollowUp(false);
    }
  }

  async function completeFollowUpReminder() {
    if (!conversation || completingFollowUp) {
      return;
    }

    try {
      isMutatingRef.current = true;
      setCompletingFollowUp(true);
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
          body: JSON.stringify({
            action: "complete_follow_up",
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
          result.error ??
            "Follow-up reminder could not be completed."
        );
      }

      setConversation(result.data.conversation);
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Follow-up reminder could not be completed."
      );
    } finally {
      isMutatingRef.current = false;
      setCompletingFollowUp(false);
    }
  }

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
                <div>
                  <div className="mb-3">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      Quick Replies
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply) => (
                        <button
                          key={reply.label}
                          type="button"
                          disabled={sending}
                          onClick={() => setMessage(reply.text)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                        >
                          {reply.label}
                        </button>
                      ))}
                    </div>
                  </div>

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
                </div>
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
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {displayPhone(customerPhone)}
                  </p>

                  {whatsappNumber ? (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={openCustomerWhatsApp}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#20bd5a]"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 2a9.6 9.6 0 0 0-8.2 14.6L2.5 21.5l5-1.3A9.6 9.6 0 1 0 12 2Zm0 17.4a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-3 .8.8-2.9-.2-.3A7.7 7.7 0 1 1 12 19.4Zm4.2-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.4-1.3-3.3-2.9-.2-.3.2-.3.6-1.1.1-.2.1-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.5 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.7.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .2-1.1-.1-.1-.2-.2-.4-.3Z" />
                        </svg>

                        {markingWhatsApp
                          ? "Updating CRM..."
                          : "Open WhatsApp"}
                      </button>

                      {conversation.whatsappContactedAt && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            WhatsApp Contacted
                          </div>

                          <p className="mt-1 text-[11px] leading-5 text-emerald-700/80">
                            {formatDate(
                              conversation.whatsappContactedAt
                            )}
                            {conversation.whatsappContactedBy
                              ? ` · ${conversation.whatsappContactedBy.name}`
                              : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700">
                      WhatsApp is unavailable because a valid customer phone number was not found for this enquiry.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {customerEmail ??
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

            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-violet-500" />
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Follow-up Reminder
                </p>
              </div>

              {conversation.followUpAt &&
              !conversation.followUpCompletedAt ? (
                <div
                  className={`mt-4 rounded-2xl border p-4 ${
                    isFollowUpDue(conversation.followUpAt)
                      ? "border-red-200 bg-red-50"
                      : "border-violet-200 bg-violet-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-extrabold ${
                          isFollowUpDue(conversation.followUpAt)
                            ? "text-red-700"
                            : "text-violet-700"
                        }`}
                      >
                        {isFollowUpDue(conversation.followUpAt)
                          ? "Follow-up is due"
                          : "Follow-up scheduled"}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatDate(conversation.followUpAt)}
                      </p>

                      {conversation.followUpNote && (
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {conversation.followUpNote}
                        </p>
                      )}

                      {conversation.followUpCreatedBy && (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Set by {conversation.followUpCreatedBy.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={completingFollowUp}
                    onClick={() => void completeFollowUpReminder()}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completingFollowUp
                      ? "Updating..."
                      : "Mark Follow-up Done"}
                  </button>
                </div>
              ) : conversation.followUpCompletedAt ? (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-bold text-emerald-700">
                    Last follow-up completed
                  </p>
                  <p className="mt-1 text-xs text-emerald-700/80">
                    {formatDate(conversation.followUpCompletedAt)}
                    {conversation.followUpCompletedBy
                      ? ` · ${conversation.followUpCompletedBy.name}`
                      : ""}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Date & time
                  </label>
                  <input
                    type="datetime-local"
                    min={getLocalDateTimeMinimum()}
                    value={followUpAt}
                    onChange={(event) =>
                      setFollowUpAt(event.target.value)
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Note (optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={followUpNote}
                    onChange={(event) =>
                      setFollowUpNote(event.target.value)
                    }
                    placeholder="Example: Call about documents"
                    className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={savingFollowUp || !followUpAt}
                  onClick={() => void saveFollowUpReminder()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CalendarClock className="h-4 w-4" />
                  {savingFollowUp
                    ? "Saving..."
                    : conversation.followUpAt &&
                        !conversation.followUpCompletedAt
                      ? "Reschedule Follow-up"
                      : "Save Follow-up Reminder"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}