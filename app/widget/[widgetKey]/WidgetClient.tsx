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
          ? "الرسوم والمدة"
          : "Fees & duration",
        value: isArabic
          ? "الرسوم والمدة"
          : "Fees & duration",
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
          ? "مسؤول التسويق"
          : "Marketing Executive",
        value: isArabic
          ? "مسؤول التسويق"
          : "Marketing Executive",
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
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="animate-pulse">
          <div className="h-24 bg-slate-200" />

          <div className="space-y-4 p-5">
            <div className="h-14 w-4/5 rounded-2xl bg-slate-100" />
            <div className="ml-auto h-12 w-3/5 rounded-2xl bg-slate-100" />
            <div className="h-14 w-2/3 rounded-2xl bg-slate-100" />
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="h-12 rounded-2xl bg-slate-100" />
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
        ? "مرحباً، أود متابعة استفساري مع مسؤول التسويق."
        : "Hello, I would like to continue my enquiry with a Marketing Executive."
    );

    window.open(
      `https://wa.me/${whatsappNumber}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!config || (error && !conversation)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
        <div className="w-full max-w-[420px] rounded-[28px] border border-red-100 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <span className="text-2xl">!</span>
          </div>

          <h1 className="mt-5 text-lg font-bold text-slate-900">
            Chat unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ??
              "The chat widget could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() => void initialiseWidget()}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const companyInitial =
    config.company.name.trim().charAt(0) || "C";

  return (
<div
  dir={isArabic ? "rtl" : "ltr"}
  onPointerDownCapture={
    handleFirstWidgetInteraction
  }
  className="flex min-h-screen items-center justify-center bg-transparent p-3 font-sans sm:p-5"
>
      <section className="flex h-[min(720px,calc(100vh-24px))] w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <header
          className="relative overflow-hidden px-5 pb-5 pt-5 text-white"
          style={{
            backgroundColor: primaryColor,
          }}
        >
          <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-black/5" />

          <div className="relative flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-lg font-bold backdrop-blur">
              {config.company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.company.logoUrl}
                  alt={config.company.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                companyInitial
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold">
                {config.widget.displayName}
              </h1>

              <div className="mt-1 flex items-center gap-2 text-xs text-white/85">
                {config.widget.showOnlineStatus && (
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.16)]" />
                )}

                <span className="truncate">
                  {isAgentActive &&
                  conversation?.assignedAgent
                    ? `${
                        conversation.assignedAgent.name
                      } ${
                        isArabic
                          ? "انضم إلى المحادثة"
                          : "joined the conversation"
                      }`
                    : isWaitingForAgent
                      ? isArabic
                        ? "في انتظار مسؤول التسويق"
                        : "Waiting for a Marketing Executive"
                      : config.widget.subtitle}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void startNewConversation()
              }
              title={
                isArabic
                  ? "بدء محادثة جديدة"
                  : "Start new conversation"
              }
              aria-label="Start new conversation"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 11a8 8 0 1 0-2.3 5.7" />
                <path d="M20 4v7h-7" />
              </svg>
            </button>
          </div>
        </header>

      {isWaitingForAgent && (
  <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
    <p className="text-xs font-medium leading-5 text-amber-800">
      {isArabic
        ? "تم تحويل استفسارك إلى مسؤول التسويق."
        : "Your enquiry has been transferred to a Marketing Executive."}
    </p>

    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={() => void startNewConversation()}
        disabled={loading}
        className="flex-1 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-amber-800 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-50"
      >
        {isArabic
          ? "بدء محادثة جديدة"
          : "Start New Chat"}
      </button>

      {canUseWhatsApp && (
        <button
          type="button"
          onClick={openWhatsApp}
          className="flex-1 rounded-xl bg-[#25D366] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#20bd5a]"
        >
          {isArabic
            ? "فتح واتساب"
            : "Open WhatsApp"}
        </button>
      )}
    </div>
  </div>
)}

        {isAgentActive &&
          conversation?.assignedAgent && (
            <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
              {isArabic
                ? `أنت الآن تتحدث مع ${conversation.assignedAgent.name}.`
                : `You are now chatting with ${conversation.assignedAgent.name}.`}
            </div>
          )}

        <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-5">
          <div className="space-y-4">
            {messages.map((message) => {
              const isCustomer =
                message.sender === "CUSTOMER";

              const senderName =
                message.sender === "AGENT"
                  ? message.senderUser?.name ??
                    conversation?.assignedAgent
                      ?.name ??
                    "Marketing Executive"
                  : message.sender === "BOT"
                    ? config.widget.displayName
                    : message.sender === "SYSTEM"
                      ? "System"
                      : isArabic
                        ? "أنت"
                        : "You";

              return (
                <article
                  key={message.id}
                  className={`flex ${
                    isCustomer
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div className="max-w-[84%]">
                    {!isCustomer && (
                      <p className="mb-1.5 px-1 text-[11px] font-semibold text-slate-500">
                        {senderName}
                      </p>
                    )}

                    <div
                      className={`whitespace-pre-wrap break-words px-4 py-3 text-sm leading-6 ${
                        isCustomer
                          ? "rounded-[20px] rounded-br-md text-white"
                          : "rounded-[20px] rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                      }`}
                      style={
                        isCustomer
                          ? {
                              backgroundColor:
                                primaryColor,
                            }
                          : undefined
                      }
                    >
{getVisibleMessageContent(
  message.content,
  isArabic
)}                    </div>

                    <div
                      className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-400 ${
                        isCustomer
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <span>
                        {formatMessageTime(
                          message.createdAt
                        )}
                      </span>

                      {isCustomer && (
                        <span>
                          {message.status === "READ"
                            ? "✓✓"
                            : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-[20px] rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="mb-2 text-[11px] font-medium text-slate-500">
                    {isArabic
                      ? "جاري تحضير الرد..."
                      : "Preparing a response..."}
                  </p>

                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
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
            <div className="border-t border-slate-100 bg-white px-4 py-3">
              <div
                className={`grid gap-2 ${
                  quickReplies.length > 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
         {quickReplies.map((reply, index) => {
  const isConsentStep =
    conversation?.currentStep === "CONSENT";

  const isPrimaryConsent =
    isConsentStep && index === 0;

  const isSecondaryConsent =
    isConsentStep && index === 1;

  return (
    <button
      key={`${reply.label}-${reply.value}`}
      type="button"
      disabled={sending}
      onClick={() =>
        void sendMessage(reply.value)
      }
      className={`w-full rounded-xl border px-4 py-3 text-center text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isPrimaryConsent
          ? "text-white shadow-lg hover:scale-[1.01] hover:brightness-95"
          : isSecondaryConsent
            ? "bg-slate-50 text-slate-500 hover:bg-slate-100"
            : "hover:bg-slate-50"
      }`}
      style={
        isPrimaryConsent
          ? {
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              color: "#ffffff",
            }
          : isSecondaryConsent
            ? {
                borderColor: "#e2e8f0",
                color: "#64748b",
              }
            : {
                borderColor: `${primaryColor}55`,
                color: primaryColor,
              }
      }
    >
      {reply.label}
    </button>
  );
})}
              </div>
            </div>
          )}

        {(showWhatsAppButton ||
          isWaitingForAgent) &&
          canUseWhatsApp && (
            <div className="border-t border-slate-100 bg-white px-4 py-3">
              <button
                type="button"
                onClick={openWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#20bd5a]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M12 2a9.6 9.6 0 0 0-8.2 14.6L2.5 21.5l5-1.3A9.6 9.6 0 1 0 12 2Zm0 17.4a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-3 .8.8-2.9-.2-.3A7.7 7.7 0 1 1 12 19.4Zm4.2-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.4-1.3-3.3-2.9-.2-.3.2-.3.6-1.1.1-.2.1-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.5 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.7.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .2-1.1-.1-.1-.2-.2-.4-.3Z" />
                </svg>

                {isArabic
                  ? "المتابعة عبر واتساب"
                  : "Continue on WhatsApp"}
              </button>
            </div>
          )}

        {error && conversation && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-xs text-red-700">
            {error}
          </div>
        )}

        <footer className="border-t border-slate-100 bg-white p-3">
        {isConversationClosed ? (
  <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
    <p className="text-center text-xs font-medium text-slate-500">
      {isArabic
        ? "تم إغلاق هذه المحادثة."
        : "This conversation has been closed."}
    </p>

    <button
      type="button"
      onClick={() =>
        void startNewConversation()
      }
      className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-95"
      style={{
        backgroundColor: primaryColor,
      }}
    >
      {isArabic
        ? "بدء محادثة جديدة"
        : "Start New Chat"}
    </button>
  </div>
          ) : choiceOnlyStep ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-medium text-slate-500">
              {isArabic
                ? "يرجى اختيار أحد الخيارات أعلاه."
                : "Please choose one of the options above."}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                rows={1}
                maxLength={2000}
                disabled={isConversationClosed}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleInputKeyDown}
                placeholder={
                  isArabic
                    ? "اكتب رسالتك..."
                    : "Type your message..."
                }
                className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={
                  sending ||
                  input.trim().length === 0
                }
                aria-label="Send message"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  backgroundColor: primaryColor,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 ${
                    isArabic ? "rotate-180" : ""
                  }`}
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

          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400">
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
              />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>

            <span>
              {isArabic
                ? "محادثة آمنة وخاصة"
                : "Secure and private conversation"}
            </span>
          </div>
        </footer>
      </section>
      
    </div>
  );
}