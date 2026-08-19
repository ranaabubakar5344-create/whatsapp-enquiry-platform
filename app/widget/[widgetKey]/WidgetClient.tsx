"use client";


import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type WidgetConfig = {
  accessToken: string;
  accessTokenExpiresInSeconds: number;

  company: {
    name: string;
    logoUrl: string | null;
    websiteUrl: string | null;
  };

  widget: {
    displayName: string;
    subtitle: string;
    launcherText: string;
    welcomeMessage: string;
    offlineMessage: string;
    humanHandoffMessage: string;
    consentText: string;
    primaryColor: string;
    position: "BOTTOM_RIGHT" | "BOTTOM_LEFT";
    defaultLanguage: string;
    enableArabic: boolean;
    collectName: boolean;
    collectPhone: boolean;
    collectEmail: boolean;
    requireConsent: boolean;
    humanHandoffEnabled: boolean;
    whatsappHandoffEnabled: boolean;
    whatsappHandoffNumber: string | null;
    showOnlineStatus: boolean;
    showAgentAvatars: boolean;
    enableSound: boolean;
    autoOpenDelaySeconds: number;
    privacyPolicyUrl: string | null;
    businessHours: unknown;
    botEnabled: boolean;
    messagingMode: string;
  };

  programmes: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    fee: string | null;
    duration: string | null;
  }>;

  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    language: string;
    category: string | null;
    sortOrder: number;
  }>;
};

type ConversationData = {
  id: string;
  status: string;
  currentStep: string;
  botActive: boolean;
  lastMessageAt?: string;

  assignedAgent?: {
    id: string;
    name: string;
    availability: string;
  } | null;
};

type ChatMessage = {
  id: string;
  clientMessageId?: string | null;
  sender: "CUSTOMER" | "BOT" | "AGENT" | "SYSTEM";
  senderUserId?: string | null;
  type: string;
  content: string;
  mediaUrl?: string | null;
  status: string;
  createdAt: string;

  senderUser?: {
    id: string;
    name: string;
  } | null;
};

type SessionResponse = {
  success: boolean;
  error?: string;

  data?: {
    isNewSession: boolean;
    visitorSessionToken: string;

    visitor: {
      id: string;
      language: string;
    };

    conversation: ConversationData;
    messages: ChatMessage[];
  };
};

type MessagesResponse = {
  success: boolean;
  duplicate?: boolean;
  error?: string;

  data?: {
    conversation: ConversationData;
    messages?: ChatMessage[];
    customerMessage?: ChatMessage;
    botMessages?: ChatMessage[];

    actions?: {
      handoffRequested: boolean;
      whatsappHandoffRequested: boolean;
      whatsappHandoffNumber: string | null;
    };
  };
};

type WidgetClientProps = {
  widgetKey: string;
};

function createClientMessageId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getVisibleMessageContent(
  content: string,
  isArabic: boolean
): string {
  const normalizedContent =
    content.trim().toLowerCase();

if (
  normalizedContent === "i agree" ||
  content.trim() === "أوافق"
) {
  return isArabic
    ? "متابعة"
    : "Continue";
}

if (
  normalizedContent === "i do not agree" ||
  content.trim() === "لا أوافق"
) {
  return isArabic
    ? "ليس الآن"
    : "Not Now";
}

  return content;
}

function renderMessageContent(
  content: string,
  isArabic: boolean
) {
  const visibleContent = getVisibleMessageContent(
    content,
    isArabic
  );

  const parts = visibleContent.split(
    /(https?:\/\/[^\s]+)/g
  );

  return parts.map((part, index) => {
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#0A1414] underline decoration-[#C8EB00] decoration-2 underline-offset-2 hover:opacity-75"
        >
          {part}
        </a>
      );
    }

    return <span key={`text-${index}`}>{part}</span>;
  });
}

function normalizeWhatsAppNumber(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return digits;
}
function getQuickReplies(
  step: string,
  language: string,
  humanHandoffEnabled: boolean,
  whatsappHandoffAvailable: boolean
): Array<{
  label: string;
  value: string;
}> {
  const isArabic = language === "ar";

  if (step === "WELCOME") {
    return [
      {
        label: isArabic
          ? "بدء المحادثة"
          : "Start conversation",
        value: isArabic ? "مرحبا" : "Hello",
      },
    ];
  }

  if (step === "LANGUAGE") {
    return [
      {
        label: "English",
        value: "English",
      },
      {
        label: "العربية",
        value: "العربية",
      },
    ];
  }

if (step === "CONSENT") {
  return [
    {
      label: isArabic
        ? "متابعة"
        : "Continue",
      value: isArabic
        ? "أوافق"
        : "I agree",
    },
    {
      label: isArabic
        ? "ليس الآن"
        : "Not Now",
      value: isArabic
        ? "لا أوافق"
        : "I do not agree",
    },
  ];
}

  if (step === "ASK_EMAIL") {
    return [
      {
        label: isArabic ? "تخطي" : "Skip",
        value: isArabic ? "تخطي" : "Skip",
      },
    ];
  }

  if (step === "MAIN_MENU" || step === "FAQ") {
    const replies = [
      {
        label: isArabic
          ? "البرامج والدورات"
          : "Programmes",
        value: isArabic
          ? "البرامج والدورات"
          : "Programmes",
      },
      {
        label: isArabic
          ? "الرسوم الدراسية"
          : "Tuition Fees",
        value: isArabic
          ? "الرسوم الدراسية"
          : "Tuition Fees",
      },
      {
        label: isArabic
          ? "القبول والمتطلبات"
          : "Admission requirements",
        value: isArabic
          ? "القبول والمتطلبات"
          : "Admission requirements",
      },
      {
        label: isArabic
          ? "الموقع"
          : "Location",
        value: isArabic
          ? "الموقع"
          : "Location",
      },
    ];

    if (humanHandoffEnabled) {
      replies.push({
        label: isArabic
          ? "تحدث مع مستشار القبول"
          : "Speak to an Admissions Advisor",
        value: isArabic
          ? "مستشار القبول"
          : "Speak to an Admissions Advisor",
      });
    }

    if (whatsappHandoffAvailable) {
      replies.push({
        label: isArabic
          ? "المتابعة عبر واتساب"
          : "Continue on WhatsApp",
        value: isArabic
          ? "المتابعة عبر واتساب"
          : "Continue on WhatsApp",
      });
    }

    return replies;
  }

  return [];
}

function LoadingScreen() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent p-0">
      <div className="h-full w-full overflow-hidden rounded-[22px] border border-black/5 bg-white">
        <div className="animate-pulse">
          <div className="h-[78px] bg-[#0A1414]" />
          <div className="space-y-3 bg-[#F7F5EE] p-3.5">
            <div className="h-4 w-14 rounded-full bg-white/80" />
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-white" />
              <div className="h-12 w-3/4 rounded-2xl bg-white" />
            </div>
            <div className="ml-auto h-11 w-1/2 rounded-2xl bg-[#EEF7B8]" />
          </div>
          <div className="border-t border-slate-100 bg-white p-2.5">
            <div className="h-10 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WidgetClient({
  widgetKey,
}: WidgetClientProps) {
  const [config, setConfig] =
    useState<WidgetConfig | null>(null);

  const [accessToken, setAccessToken] = useState("");

  const [
    visitorSessionToken,
    setVisitorSessionToken,
  ] = useState("");

  const [conversation, setConversation] =
    useState<ConversationData | null>(null);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    showWhatsAppButton,
    setShowWhatsAppButton,
  ] = useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const notificationAudioRef =
    useRef<HTMLAudioElement | null>(null);

  const welcomeSoundPlayedRef = useRef(false);
  const sendingRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const messageRequestActiveRef = useRef(false);
  const lastScrolledMessageIdRef =
    useRef<string | null>(null);
  const sessionVersionRef = useRef(0);

  const sessionStorageKey = useMemo(
    () => `enquiry-widget-session:${widgetKey}`,
    [widgetKey]
  );

  const language =
    conversation?.currentStep === "LANGUAGE"
      ? config?.widget.defaultLanguage ?? "en"
      : messages.some((message) =>
          /[\u0600-\u06FF]/.test(message.content)
        )
        ? "ar"
        : config?.widget.defaultLanguage ?? "en";

  const isArabic = language === "ar";

  const isConversationClosed =
    conversation?.status === "CLOSED" ||
    conversation?.status === "SPAM";

  const isWaitingForAgent =
    conversation?.status === "WAITING_FOR_AGENT";

  const isAgentActive =
    conversation?.status === "AGENT_ACTIVE";

  const primaryColor =
    config?.widget.primaryColor ?? "#2563EB";

  const whatsappNumber = useMemo(
    () =>
      normalizeWhatsAppNumber(
        config?.widget.whatsappHandoffNumber ?? null
      ),
    [config?.widget.whatsappHandoffNumber]
  );

  const canUseWhatsApp = Boolean(
    config?.widget.whatsappHandoffEnabled &&
      whatsappNumber
  );

  const quickReplies = useMemo(
    () =>
      getQuickReplies(
        conversation?.currentStep ?? "WELCOME",
        language,
        config?.widget.humanHandoffEnabled ?? true,
        canUseWhatsApp
      ),
    [
      conversation?.currentStep,
      language,
      config?.widget.humanHandoffEnabled,
      canUseWhatsApp,
    ]
  );

  const choiceOnlyStep = [
    "WELCOME",
    "LANGUAGE",
    "CONSENT",
  ].includes(conversation?.currentStep ?? "");

  const latestMessageId =
    messages[messages.length - 1]?.id ?? null;

  useEffect(() => {
    if (
      !latestMessageId ||
      lastScrolledMessageIdRef.current ===
        latestMessageId
    ) {
      return;
    }

    const behavior: ScrollBehavior =
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

  useEffect(() => {
    const audio = new Audio(
    "/sounds/widget-notification.wav"
  );

  audio.preload = "auto";
  audio.volume = 0.45;

  notificationAudioRef.current = audio;

  return () => {
    audio.pause();
    notificationAudioRef.current = null;
  };
}, []);

const playNotificationSound =
  useCallback(async (): Promise<boolean> => {
    if (
      config?.widget.enableSound === false
    ) {
      return false;
    }

    const audio =
      notificationAudioRef.current;

    if (!audio) {
      return false;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
      return true;
    } catch {
      // Browser ne autoplay block kiya.
      // First visitor interaction par dobara try hoga.
      return false;
    }
  }, [config?.widget.enableSound]);

const handleFirstWidgetInteraction =
  useCallback(() => {
    if (welcomeSoundPlayedRef.current) {
      return;
    }

    void playNotificationSound().then(
      (played) => {
        if (played) {
          welcomeSoundPlayedRef.current =
            true;
        }
      }
    );
  }, [playNotificationSound]);

// Widget load hone par welcome sound ki attempt.
useEffect(() => {
  if (
    !config ||
    !conversation ||
    welcomeSoundPlayedRef.current
  ) {
    return;
  }

  void playNotificationSound().then(
    (played) => {
      if (played) {
        welcomeSoundPlayedRef.current =
          true;
      }
    }
  );
}, [
  config,
  conversation,
  playNotificationSound,
]);


  const loadConfiguration =
    useCallback(async (): Promise<WidgetConfig> => {
      const response = await fetch(
        `/api/widget/${encodeURIComponent(
          widgetKey
        )}/config`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = (await response.json()) as {
        success: boolean;
        data?: WidgetConfig;
        error?: string;
      };

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ??
            "Widget configuration could not be loaded."
        );
      }
      setConfig(result.data);
      setAccessToken(result.data.accessToken);

      return result.data;
    }, [widgetKey]);

  const createOrRestoreSession = useCallback(
    async (
      currentAccessToken: string,
      forceNewSession = false
    ): Promise<void> => {
      const storedSessionToken = forceNewSession
        ? null
        : window.localStorage.getItem(
            sessionStorageKey
          );

      const response = await fetch(
        `/api/widget/${encodeURIComponent(
          widgetKey
        )}/session`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Widget-Access-Token":
              currentAccessToken,
          },
          body: JSON.stringify({
            visitorSessionToken:
              storedSessionToken,
            pageUrl:
              document.referrer ||
              window.location.href,
            referrer:
              document.referrer || null,
            language: navigator.language
              .toLowerCase()
              .startsWith("ar")
              ? "ar"
              : "en",
          }),
        }
      );

      const result =
        (await response.json()) as SessionResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ??
            "Chat session could not be started."
        );
      }

      window.localStorage.setItem(
        sessionStorageKey,
        result.data.visitorSessionToken
      );

      setVisitorSessionToken(
        result.data.visitorSessionToken
      );

      setConversation(result.data.conversation);
      setMessages(result.data.messages);
    },
    [sessionStorageKey, widgetKey]
  );

  const initialiseWidget = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const configuration =
        await loadConfiguration();

      await createOrRestoreSession(
        configuration.accessToken
      );
    } catch (initializationError) {
      console.error(
        "Widget initialization error:",
        initializationError
      );

      setError(
        initializationError instanceof Error
          ? initializationError.message
          : "Chat could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [createOrRestoreSession, loadConfiguration]);

  const startNewConversation =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        setShowWhatsAppButton(false);

        sessionVersionRef.current += 1;
        refreshInFlightRef.current = false;
        messageRequestActiveRef.current = false;
        sendingRef.current = false;
        lastScrolledMessageIdRef.current = null;

        window.localStorage.removeItem(
          sessionStorageKey
        );

        setVisitorSessionToken("");
        setConversation(null);
        setMessages([]);
        setInput("");

        const configuration =
          await loadConfiguration();

        await createOrRestoreSession(
          configuration.accessToken,
          true
        );
      } catch (restartError) {
        console.error(
          "New conversation error:",
          restartError
        );

        setError(
          restartError instanceof Error
            ? restartError.message
            : "A new conversation could not be started."
        );
      } finally {
        setLoading(false);
      }
    }, [
      createOrRestoreSession,
      loadConfiguration,
      sessionStorageKey,
    ]);

  useEffect(() => {
    void initialiseWidget();
  }, [initialiseWidget]);

  useEffect(() => {
    if (!config) {
      return;
    }

    const refreshAfterMilliseconds = Math.max(
      (config.accessTokenExpiresInSeconds - 60) *
        1000,
      60_000
    );

    const timeout = window.setTimeout(() => {
      void loadConfiguration().catch(
        (refreshError) => {
          console.error(
            "Access token refresh failed:",
            refreshError
          );
        }
      );
    }, refreshAfterMilliseconds);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [config, loadConfiguration]);

  const currentConversationId =
    conversation?.id ?? "";

  const currentConversationStatus =
    conversation?.status ?? "";

  const refreshMessages = useCallback(async () => {
    if (
      !accessToken ||
      !visitorSessionToken ||
      !currentConversationId ||
      refreshInFlightRef.current ||
      messageRequestActiveRef.current ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    const requestSessionVersion =
      sessionVersionRef.current;

    refreshInFlightRef.current = true;

    try {
      const searchParams = new URLSearchParams({
        visitorSessionToken,
        conversationId: currentConversationId,
      });

      const response = await fetch(
        `/api/widget/${encodeURIComponent(
          widgetKey
        )}/messages?${searchParams.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "X-Widget-Access-Token":
              accessToken,
          },
        }
      );

      if (response.status === 401) {
        const refreshedConfig =
          await loadConfiguration();

        setAccessToken(
          refreshedConfig.accessToken
        );

        return;
      }

      const result =
        (await response.json()) as MessagesResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        return;
      }

      if (
        messageRequestActiveRef.current ||
        requestSessionVersion !==
          sessionVersionRef.current
      ) {
        return;
      }

      const nextConversation =
        result.data.conversation;

      const nextMessages =
        result.data.messages;

      setConversation((current) => {
        if (!current) {
          return nextConversation;
        }

        const changed =
          current.id !== nextConversation.id ||
          current.status !==
            nextConversation.status ||
          current.currentStep !==
            nextConversation.currentStep ||
          current.botActive !==
            nextConversation.botActive ||
          current.lastMessageAt !==
            nextConversation.lastMessageAt ||
          current.assignedAgent?.id !==
            nextConversation.assignedAgent?.id ||
          current.assignedAgent?.availability !==
            nextConversation.assignedAgent
              ?.availability;

        return changed
          ? nextConversation
          : current;
      });

      if (!Array.isArray(nextMessages)) {
        return;
      }

      setMessages((current) => {
        const changed =
          current.length !== nextMessages.length ||
          current.some((message, index) => {
            const nextMessage =
              nextMessages[index];

            return (
              !nextMessage ||
              message.id !== nextMessage.id ||
              message.status !==
                nextMessage.status ||
              message.content !==
                nextMessage.content ||
              message.senderUserId !==
                nextMessage.senderUserId
            );
          });

        return changed
          ? nextMessages
          : current;
      });
    } catch (refreshError) {
      if (navigator.onLine) {
        console.warn(
          "Message refresh temporarily unavailable:",
          refreshError
        );
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [
    accessToken,
    currentConversationId,
    loadConfiguration,
    visitorSessionToken,
    widgetKey,
  ]);

  useEffect(() => {
    if (
      !currentConversationId ||
      !visitorSessionToken ||
      !accessToken
    ) {
      return;
    }

    const pollingInterval =
      currentConversationStatus ===
        "AGENT_ACTIVE" ||
      currentConversationStatus ===
        "WAITING_FOR_AGENT"
        ? 5000
        : 10000;

    const poll = () => {
      if (
        document.visibilityState === "visible"
      ) {
        void refreshMessages();
      }
    };

    const interval = window.setInterval(
      poll,
      pollingInterval
    );

    document.addEventListener(
      "visibilitychange",
      poll
    );

    window.addEventListener("online", poll);

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        poll
      );

      window.removeEventListener(
        "online",
        poll
      );
    };
  }, [
    accessToken,
    currentConversationId,
    currentConversationStatus,
    refreshMessages,
    visitorSessionToken,
  ]);

   const sendMessage = useCallback(
    async (messageValue: string) => {
      const cleanMessage = messageValue.trim();

     if (
  !cleanMessage ||
  sendingRef.current ||
  !conversation ||
  !visitorSessionToken ||
  !accessToken ||
  isConversationClosed
) {
  return;
}

sendingRef.current = true;
messageRequestActiveRef.current = true;

      const clientMessageId =
        createClientMessageId();

      const temporaryMessageId =
        `temporary-${clientMessageId}`;

      const optimisticMessage: ChatMessage = {
        id: temporaryMessageId,
        clientMessageId,
        sender: "CUSTOMER",
        senderUserId: null,
        type: "TEXT",
        content: cleanMessage,
        mediaUrl: null,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        senderUser: null,
      };

      setSending(true);
      setError(null);
      setInput("");

      // Customer message instantly screen par show hogi.
      setMessages((currentMessages) => [
        ...currentMessages,
        optimisticMessage,
      ]);

      try {
        const response = await fetch(
          `/api/widget/${encodeURIComponent(
            widgetKey
          )}/messages`,
          {
            method: "POST",
            cache: "no-store",

            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
              "X-Widget-Access-Token":
                accessToken,
            },

            body: JSON.stringify({
              visitorSessionToken,
              conversationId:
                conversation.id,
              clientMessageId,
              message: cleanMessage,
            }),
          }
        );

        if (response.status === 401) {
          const refreshedConfig =
            await loadConfiguration();

          setAccessToken(
            refreshedConfig.accessToken
          );

          throw new Error(
            "Your secure session was refreshed. Please send your message again."
          );
        }

        const result =
          (await response.json()) as
            MessagesResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          const apiError =
            result.error ??
            "Your message could not be sent.";

          if (
            apiError
              .toLowerCase()
              .includes("conversation is closed")
          ) {
            const closedSystemMessage: ChatMessage = {
              id: `conversation-closed-${Date.now()}`,
              clientMessageId: null,
              sender: "SYSTEM",
              senderUserId: null,
              type: "TEXT",
              content: isArabic
                ? "لا مشكلة. لم يتم حفظ تفاصيل استفسارك. يمكنك بدء محادثة جديدة في أي وقت."
                : "No problem. Your enquiry details were not saved. You can start a new chat whenever you are ready.",
              mediaUrl: null,
              status: "SENT",
              createdAt: new Date().toISOString(),
              senderUser: null,
            };

            setConversation((currentConversation) =>
              currentConversation
                ? {
                    ...currentConversation,
                    status: "CLOSED",
                    botActive: false,
                  }
                : currentConversation
            );

            setMessages(
              (currentMessages): ChatMessage[] => [
                ...currentMessages.filter(
                  (message) =>
                    message.id !== temporaryMessageId
                ),
                closedSystemMessage,
              ]
            );

            setInput("");
            setError(null);
            return;
          }

          throw new Error(apiError);
        }

        setConversation(
          result.data.conversation
        );

        /*
         * Fast API response only returns the newly
         * created customer and bot messages. This
         * avoids loading the complete message history
         * after every send.
         */
        if (
          result.data.customerMessage
        ) {
          const newMessages = [
            result.data.customerMessage,
            ...(result.data.botMessages ?? []),
          ];

          setMessages((currentMessages) => {
            const existingMessages =
              currentMessages.filter(
                (currentMessage) =>
                  currentMessage.id !==
                  temporaryMessageId
              );

            const knownIds = new Set(
              existingMessages.map(
                (currentMessage) =>
                  currentMessage.id
              )
            );

            const uniqueNewMessages =
              newMessages.filter(
                (newMessage) =>
                  !knownIds.has(newMessage.id)
              );

            return [
              ...existingMessages,
              ...uniqueNewMessages,
            ];
          });
        } else if (result.data.messages) {
          // Duplicate/recovery responses can still
          // return the complete message history.
          setMessages(
            result.data.messages
          );
        }

        if (
          result.data.actions
            ?.whatsappHandoffRequested
        ) {
          setShowWhatsAppButton(true);
        }
      } catch (sendError) {
        console.warn(
          "Widget message was not sent:",
          sendError
        );

        // Failed temporary message remove hogi.
        setMessages((currentMessages) =>
          currentMessages.filter(
            (message) =>
              message.id !==
              temporaryMessageId
          )
        );

        setInput(cleanMessage);

        setError(
          sendError instanceof Error
            ? sendError.message
            : "Your message could not be sent."
        );
      } finally {
        messageRequestActiveRef.current = false;
        sendingRef.current = false;
        setSending(false);
      }
    },
    [
      accessToken,
      conversation,
      isArabic,
      isConversationClosed,
      loadConfiguration,
      visitorSessionToken,
      widgetKey,
    ]
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function openWhatsApp() {
    if (!whatsappNumber) {
      return;
    }

    const text = encodeURIComponent(
      isArabic
        ? "مرحباً، أود متابعة استفساري مع مستشار القبول."
        : "Hello, I would like to continue my enquiry with a Admissions Advisor."
    );

    window.open(
      `https://wa.me/${whatsappNumber}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function closeWidget() {
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: "website-enquiry-widget-close",
          widgetKey,
        },
        "*"
      );
      return;
    }

    // Direct Test Widget page: close the tab when possible.
    if (window.opener) {
      window.close();
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!config || (error && !conversation)) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-transparent p-0">
        <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] border border-red-100 bg-white p-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-lg font-black text-red-600">
            !
          </div>
          <h1 className="mt-4 text-base font-bold text-[#0A1414]">
            Chat unavailable
          </h1>
          <p className="mt-2 text-xs leading-5 text-[#667085]">
            {error ?? "The chat widget could not be loaded."}
          </p>
          <button
            type="button"
            onClick={() => void initialiseWidget()}
            className="mt-5 rounded-full bg-[#0A1414] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A1414]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const chatbotAvatar = "/chat.png";

  const agentInitial =
    conversation?.assignedAgent?.name
      ?.trim()
      .charAt(0)
      .toUpperCase() || "A";

  const ucaDark = "#0A1414";
  const ucaDarkSoft = "#070707";
  const ucaLime = "#C8EB00";
  const ucaLimeHover = "#B6D900";
  const ucaLimeSoft = "#EFF6BE";
  const ucaPanelSoft = "#F5F5F2";
  const ucaBackground = "#F7F5EE";
  const ucaText = "#0A1414";
  const ucaMuted = "#667085";
  const ucaBorder = "#E5E7EB";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      onPointerDownCapture={handleFirstWidgetInteraction}
      className="h-screen w-screen overflow-hidden bg-transparent p-0 font-sans"
    >
      <style>{`
        .uca-chat-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #B8BDC5 transparent;
        }

        .uca-chat-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .uca-chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .uca-chat-scrollbar::-webkit-scrollbar-thumb {
          background: #B8BDC5;
          border-radius: 999px;
        }

        .uca-chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #98A2B3;
        }
      `}</style>

      <section className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-[22px] border border-black/5 bg-white">
        <header
          className="relative overflow-hidden px-3.5 py-3 text-white"
          style={{ background: `linear-gradient(135deg, ${ucaDark} 0%, ${ucaDarkSoft} 100%)` }}
        >
          <div className="pointer-events-none absolute -right-10 -top-14 h-28 w-28 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-5 h-24 w-24 rounded-full bg-white/[0.05]" />

          <div className="relative flex items-center gap-2.5">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white/80 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={chatbotAvatar}
                alt={config.widget.displayName}
                className="h-full w-full object-cover"
              />
              {config.widget.showOnlineStatus && (
                <span
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: ucaLime }}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[13px] font-bold leading-5">
                UCA Admissions Assistant
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-white/85">
                {config.widget.showOnlineStatus && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ucaLime }}
                  />
                )}
                <span className="truncate">
                  {isAgentActive && conversation?.assignedAgent
                    ? `${conversation.assignedAgent.name} ${
                        isArabic ? "متصل الآن" : "is online"
                      }`
                    : isWaitingForAgent
                      ? isArabic
                        ? "جاري توصيلك بمستشار القبول"
                        : "Connecting you to a Admissions Advisor"
                      : "Courses, Admissions & Applications"}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void startNewConversation()}
                title={isArabic ? "بدء محادثة جديدة" : "Start new chat"}
                aria-label={isArabic ? "بدء محادثة جديدة" : "Start new chat"}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 11a8.1 8.1 0 1 0 .4 4" />
                  <path d="M20 4v7h-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={closeWidget}
                title={isArabic ? "إغلاق المحادثة" : "Close chat"}
                aria-label={isArabic ? "إغلاق المحادثة" : "Close chat"}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {isWaitingForAgent && (
          <div className="border-b border-[#E5E7EB] bg-[#F5F5F2] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8EB00] text-[#0A1414]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-bold text-[#0A1414]">
                  {isArabic ? "تم طلب التحويل" : "Handoff requested"}
                </p>
                <p className="mt-0.5 text-[9px] leading-4 text-[#4B5563]">
                  {isArabic
                    ? "سيقوم مستشار القبول بالانضمام إلى المحادثة."
                    : "A Admissions Advisor will join your conversation."}
                </p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => void startNewConversation()}
                disabled={loading}
                className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-2 text-[9.5px] font-bold text-[#0A1414] transition hover:border-[#C8EB00] hover:bg-[#FAFAF7] disabled:opacity-50"
              >
                {isArabic ? "محادثة جديدة" : "New Chat"}
              </button>

              {canUseWhatsApp && (
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="rounded-lg bg-[#0A1414] px-2.5 py-2 text-[9.5px] font-bold text-white transition hover:bg-[#162323]"
                >
                  {isArabic ? "فتح واتساب" : "Open WhatsApp"}
                </button>
              )}
            </div>
          </div>
        )}

        {isAgentActive && conversation?.assignedAgent && (
          <div className="border-b border-[#E5E7EB] bg-[#F5F5F2] px-3 py-2">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-[#0A1414]"
                style={{ backgroundColor: ucaLime }}
              >
                {agentInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10.5px] font-bold text-[#0A1414]">
                  {conversation.assignedAgent.name}
                </p>
                <p className="text-[9px] text-[#4B5563]">
                  {isArabic
                    ? "مستشار القبول متصل الآن"
                    : "Admissions Advisor is now online"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          className="uca-chat-scrollbar relative flex-1 overflow-y-auto px-3 py-3"
          style={{
            backgroundColor: ucaBackground,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(17,27,33,0.045) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        >
          <div className="mx-auto mb-3 w-fit rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#667085] shadow-[0_1px_2px_rgba(10,20,20,0.05)]">
            {isArabic ? "اليوم" : "Today"}
          </div>

          <div className="space-y-2.5">
            {messages.map((message) => {
              const isCustomer = message.sender === "CUSTOMER";
              const isSystem = message.sender === "SYSTEM";

              const senderName =
                message.sender === "AGENT"
                  ? message.senderUser?.name ??
                    conversation?.assignedAgent?.name ??
                    "Admissions Advisor"
                  : message.sender === "BOT"
                    ? config.widget.displayName
                    : isSystem
                      ? "System"
                      : isArabic
                        ? "أنت"
                        : "You";

              if (isSystem) {
                return (
                  <article key={message.id} className="flex justify-center">
                    <div className="max-w-[88%] rounded-full bg-white/85 px-3 py-1.5 text-center text-[8.5px] font-medium leading-4 text-[#667085] shadow-sm">
                      {renderMessageContent(message.content, isArabic)}
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={message.id}
                  className={`flex items-end gap-1.5 ${
                    isCustomer ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isCustomer && config.widget.showAgentAvatars && (
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-white text-[9px] font-bold text-[#0A1414] shadow-sm"
                      style={{ backgroundColor: ucaLime }}
                    >
                      {message.sender === "AGENT" ? (
                        (
                          message.senderUser?.name ??
                          conversation?.assignedAgent?.name ??
                          "A"
                        )
                          .trim()
                          .charAt(0)
                          .toUpperCase()
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={chatbotAvatar}
                          alt={config.widget.displayName}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  <div className="max-w-[78%]">
                    {message.sender === "AGENT" && (
                      <p className="mb-0.5 px-1 text-[8.5px] font-bold text-[#667085]">
                        {senderName}
                      </p>
                    )}

                    <div
                      className="whitespace-pre-wrap break-words rounded-[14px] px-3 py-2 text-[11.5px] leading-[1.45] shadow-sm"
                      style={
                        isCustomer
                          ? {
                              backgroundColor: ucaLimeSoft,
                              color: ucaText,
                              border: "1px solid rgba(200,235,0,0.45)",
                              borderBottomRightRadius: "4px",
                            }
                          : {
                              backgroundColor: "#FFFFFF",
                              color: ucaText,
                              border: `1px solid ${ucaBorder}`,
                              borderBottomLeftRadius: "4px",
                            }
                      }
                    >
                      {renderMessageContent(message.content, isArabic)}
                    </div>

                    <div
                      className={`mt-0.5 flex items-center gap-1 px-1 text-[7.5px] ${
                        isCustomer ? "justify-end" : "justify-start"
                      }`}
                      style={{ color: ucaMuted }}
                    >
                      <span>{formatMessageTime(message.createdAt)}</span>

                      {isCustomer && (
                        <span
                          className={
                            message.status === "READ"
                              ? "font-bold text-[#0A1414]"
                              : ""
                          }
                        >
                          {message.status === "READ" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {sending && (
              <div className="flex items-end gap-1.5">
                {config.widget.showAgentAvatars && (
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white bg-white shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={chatbotAvatar}
                      alt={config.widget.displayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="rounded-[14px] rounded-bl-[4px] border border-[#E5E7EB] bg-white px-3 py-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {quickReplies.length > 0 &&
          !isConversationClosed &&
          !sending && (
            <div className="border-t border-[#E5E7EB] bg-white px-3 py-2">
              <div
                className={`grid gap-1.5 ${
                  quickReplies.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-2"
                }`}
              >
                {quickReplies.map((reply, index) => {
                  const isConsentStep =
                    conversation?.currentStep === "CONSENT";
                  const isPrimaryConsent = isConsentStep && index === 0;
                  const isSecondaryConsent = isConsentStep && index === 1;

                  return (
                    <button
                      key={`${reply.label}-${reply.value}`}
                      type="button"
                      disabled={sending}
                      onClick={() => void sendMessage(reply.value)}
                      className={`min-h-[34px] rounded-lg border px-2.5 py-1.5 text-center text-[9.5px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isPrimaryConsent
                          ? "text-[#0A1414]"
                          : isSecondaryConsent
                            ? "border-slate-200 bg-slate-50 text-slate-500"
                            : "border-[#E5E7EB] bg-white text-[#0A1414] hover:border-[#C8EB00] hover:bg-[#FAFAF7]"
                      }`}
                      style={
                        isPrimaryConsent
                          ? {
                              backgroundColor: ucaLime,
                              borderColor: ucaLime,
                            }
                          : isSecondaryConsent
                            ? undefined
                            : undefined
                      }
                    >
                      {reply.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        {(showWhatsAppButton || isWaitingForAgent) && canUseWhatsApp && (
          <div className="border-t border-[#E5E7EB] bg-white px-3 py-2">
            <button
              type="button"
              onClick={openWhatsApp}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0A1414] px-3 py-2 text-[10.5px] font-bold text-white transition hover:bg-[#162323]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-[#C8EB00]"
                fill="currentColor"
              >
                <path d="M12 2a9.6 9.6 0 0 0-8.2 14.6L2.5 21.5l5-1.3A9.6 9.6 0 1 0 12 2Zm0 17.4a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-3 .8.8-2.9-.2-.3A7.7 7.7 0 1 1 12 19.4Zm4.2-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.4-1.3-3.3-2.9-.2-.3.2-.3.6-1.1.1-.2.1-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.5 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.7.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .2-1.1-.1-.1-.2-.2-.4-.3Z" />
              </svg>

              {isArabic ? "المتابعة عبر واتساب" : "Continue on WhatsApp"}
            </button>
          </div>
        )}

        {error && conversation && (
          <div className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-center text-[8.5px] text-red-700">
            {error}
          </div>
        )}

        <footer className="border-t border-[#E5E7EB] bg-white p-2">
          {isConversationClosed ? (
            <div className="space-y-2">
              <p className="text-center text-[9px] font-medium text-[#667085]">
                {isArabic
                  ? "تم إغلاق هذه المحادثة."
                  : "This conversation has been closed."}
              </p>

              <button
                type="button"
                onClick={() => void startNewConversation()}
                className="w-full rounded-full bg-[#0A1414] px-3 py-2 text-[10.5px] font-bold text-white transition hover:bg-[#162323]"
              >
                {isArabic ? "بدء محادثة جديدة" : "Start New Chat"}
              </button>
            </div>
          ) : choiceOnlyStep ? (
            <p className="py-1 text-center text-[8.5px] font-medium text-[#98A2B3]">
              {isArabic
                ? "اختر أحد الخيارات للمتابعة"
                : "Select an option to continue"}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
              <div className="flex min-h-10 flex-1 items-end rounded-full border border-[#E5E7EB] bg-[#F4F4F1] transition focus-within:border-[#C8EB00]">
                <textarea
                  value={input}
                  rows={1}
                  maxLength={2000}
                  disabled={isConversationClosed}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={
                    isArabic ? "اكتب رسالتك..." : "Type a message..."
                  }
                  className="max-h-20 min-h-10 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-[10.5px] text-[#0A1414] outline-none placeholder:text-[#98A2B3] disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={sending || input.trim().length === 0}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C8EB00] text-[#0A1414] shadow-sm transition hover:bg-[#B6D900] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </form>
          )}

          <div className="mt-1.5 flex items-center justify-center gap-1 text-[7.5px] font-medium text-[#98A2B3]">
            <svg
              viewBox="0 0 24 24"
              className="h-2.5 w-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <span>
              {isArabic ? "محادثة آمنة وخاصة" : "Secure & private"}
            </span>
          </div>
        </footer>
      </section>
    </div>
  );
}