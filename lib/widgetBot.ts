import parsePhoneNumber from "libphonenumber-js/max";

export type WebsiteBotStep =
  | "WELCOME"
  | "LANGUAGE"
  | "CONSENT"
  | "MAIN_MENU"
  | "ASK_NAME"
  | "ASK_PHONE"
  | "ASK_EMAIL"
  | "ASK_COURSE"
  | "ASK_COUNTRY"
  | "FAQ"
  | "COMPLETED"
  | "HUMAN_HANDOFF"
  | "WAITING_FOR_AGENT"
  | "AGENT_CONNECTED";
type PhoneValidationResult = {
  isValid: boolean;
  normalizedPhone: string | null;
};

function validatePhoneNumber(
  value: string
): PhoneValidationResult {
  const input = value.trim();

  if (!input) {
    return {
      isValid: false,
      normalizedPhone: null,
    };
  }

  // Allow only common phone-number characters.
  if (!/^\+?[0-9\s()-]+$/.test(input)) {
    return {
      isValid: false,
      normalizedPhone: null,
    };
  }

  // If the user enters +country code, validate it as a real
  // international number and save it in E.164 format.
  if (input.startsWith("+")) {
    try {
      const phoneNumber = parsePhoneNumber(input, {
        extract: false,
      });

      if (
        !phoneNumber ||
        !phoneNumber.isPossible() ||
        !phoneNumber.isValid()
      ) {
        return {
          isValid: false,
          normalizedPhone: null,
        };
      }

      return {
        isValid: true,
        normalizedPhone: phoneNumber.number,
      };
    } catch {
      return {
        isValid: false,
        normalizedPhone: null,
      };
    }
  }

  // Local numbers are also accepted, for example:
  // 0541234567, 0501234567, 03231234567.
  // We keep the leading zero because no country has been selected yet.
  const digitsOnly = input.replace(/\D/g, "");

  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      isValid: false,
      normalizedPhone: null,
    };
  }

  return {
    isValid: true,
    normalizedPhone: digitsOnly,
  };
}

export type WidgetProgramme = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fee: string | null;
  duration: string | null;
};

export type WidgetFaq = {
  id: string;
  question: string;
  answer: string;
  language: string;
  category: string | null;
  keywords?: unknown;
};

export type WidgetBotSettings = {
  enableArabic: boolean;
  requireConsent: boolean;
  collectName: boolean;
  collectPhone: boolean;
  collectEmail: boolean;
  humanHandoffEnabled: boolean;
  whatsappHandoffEnabled: boolean;
};

export type WidgetBotContext = {
  consent?: boolean;
  intent?: "HUMAN_HANDOFF";
  name?: string;
  phone?: string;
  email?: string;
  programmeId?: string;
  programmeName?: string;
  country?: string;
};

export type WidgetBotDecision = {
  replies: string[];
  nextStep: WebsiteBotStep;
  language: "en" | "ar";
  contextData: WidgetBotContext;
  handoffRequested: boolean;
  whatsappHandoffRequested: boolean;
  closeConversation: boolean;
  leadReady: boolean;
};

type HandleWidgetBotInput = {
  message: string;
  currentStep: WebsiteBotStep;
  language: string;
  contextData: unknown;
  settings: WidgetBotSettings;
  programmes: WidgetProgramme[];
  faqs: WidgetFaq[];
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@+.\s-]/gu, " ")
    .replace(/\s+/g, " ");
}

function parseContextData(value: unknown): WidgetBotContext {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  return { ...(value as WidgetBotContext) };
}

function resolveLanguage(
  currentLanguage: string,
  message: string
): "en" | "ar" {
  const normalized = normalizeText(message);

  if (
    normalized === "2" ||
    normalized === "ar" ||
    normalized.includes("arabic") ||
    normalized.includes("العربية") ||
    normalized.includes("عربي")
  ) {
    return "ar";
  }

  if (
    normalized === "1" ||
    normalized === "en" ||
    normalized.includes("english") ||
    normalized.includes("انجليزي")
  ) {
    return "en";
  }

  return currentLanguage === "ar" ? "ar" : "en";
}

function isPositiveReply(message: string): boolean {
  const normalized = normalizeText(message);

  return [
    "1",
    "yes",
    "y",
    "agree",
    "accept",
    "continue",
    "ok",
    "okay",
    "نعم",
    "موافق",
    "أوافق",
    "اوافق",
  ].some(
    (item) =>
      normalized === item ||
      normalized.includes(item)
  );
}

function isNegativeReply(message: string): boolean {
  const normalized = normalizeText(message);

  return [
    "2",
    "no",
    "n",
    "decline",
    "reject",
    "cancel",
    "لا",
    "رفض",
  ].some(
    (item) =>
      normalized === item ||
      normalized.includes(item)
  );
}
function getInvalidPhoneMessage(
  language: "en" | "ar"
): string {
  return language === "ar"
    ? "رقم الهاتف غير صحيح. يمكنك إدخال رقم محلي أو رقم دولي مع رمز الدولة.\nأمثلة: +971 00 000 0000 "
    : "That phone number does not look valid. You can enter a local number or an international number with country code.\nExamples: +971 00 000 0000, 054 000 0000";
}
function isHumanHandoffRequest(message: string): boolean {
  const normalized = normalizeText(message);

  const phrases = [
    "agent",
    "human",
    "admissions advisor",
    "marketing",
    "representative",
    "counsellor",
    "counselor",
    "advisor",
    "adviser",
    "speak to someone",
    "talk to someone",
    "real person",
    "customer support",
    "live chat",
    "موظف",
    "مستشار",
    "خدمة العملاء",
    "شخص حقيقي",
  ];

  return phrases.some((phrase) =>
    normalized.includes(phrase)
  );
}

function isWhatsAppRequest(message: string): boolean {
  const normalized = normalizeText(message);

  return (
    normalized.includes("whatsapp") ||
    normalized.includes("واتساب") ||
    normalized.includes("واتس اب")
  );
}

function isProgrammesRequest(message: string): boolean {
  const normalized = normalizeText(message);

  return (
    normalized === "1" ||
    normalized.includes("programme") ||
    normalized.includes("program") ||
    normalized.includes("course") ||
    normalized.includes("diploma") ||
    normalized.includes("برامج") ||
    normalized.includes("برنامج") ||
    normalized.includes("دورات")
  );
}

function isFeesRequest(message: string): boolean {
  const normalized = normalizeText(message);

  return (
    normalized === "2" ||
    normalized.includes("fee") ||
    normalized.includes("fees") ||
    normalized.includes("price") ||
    normalized.includes("cost") ||
    normalized.includes("tuition") ||
    normalized.includes("رسوم") ||
    normalized.includes("سعر") ||
    normalized.includes("تكلفة")
  );
}

function isAdmissionRequest(message: string): boolean {
  const normalized = normalizeText(message);

  return (
    normalized === "3" ||
    normalized.includes("admission") ||
    normalized.includes("apply") ||
    normalized.includes("application") ||
    normalized.includes("requirement") ||
    normalized.includes("entry") ||
    normalized.includes("قبول") ||
    normalized.includes("تسجيل") ||
    normalized.includes("متطلبات")
  );
}

function isLocationRequest(message: string): boolean {
  const normalized = normalizeText(message);

  return (
    normalized === "4" ||
    normalized.includes("location") ||
    normalized.includes("address") ||
    normalized.includes("campus") ||
    normalized.includes("map") ||
    normalized.includes("موقع") ||
    normalized.includes("عنوان")
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function resolveProgramme(
  message: string,
  programmes: WidgetProgramme[]
): WidgetProgramme | null {
  const normalized = normalizeText(message);

  const selectedNumber = Number.parseInt(normalized, 10);

  if (
    Number.isInteger(selectedNumber) &&
    selectedNumber >= 1 &&
    selectedNumber <= programmes.length
  ) {
    return programmes[selectedNumber - 1] ?? null;
  }

  return (
    programmes.find((programme) => {
      const programmeName = normalizeText(programme.name);
      const programmeSlug = normalizeText(
        programme.slug.replace(/-/g, " ")
      );

      return (
        normalized === programmeName ||
        normalized === programmeSlug ||
        normalized.includes(programmeName) ||
        programmeName.includes(normalized)
      );
    }) ?? null
  );
}

function findMatchingFaq(
  message: string,
  language: "en" | "ar",
  faqs: WidgetFaq[]
): WidgetFaq | null {
  const normalizedMessage = normalizeText(message);

  const languageFaqs = faqs.filter(
    (faq) =>
      faq.language.toLowerCase() === language ||
      faq.language.toLowerCase() === "all"
  );

  let bestMatch: WidgetFaq | null = null;
  let bestScore = 0;

  for (const faq of languageFaqs) {
    const searchableParts = [
      faq.question,
      faq.category ?? "",
    ];

    if (Array.isArray(faq.keywords)) {
      searchableParts.push(
        ...faq.keywords.filter(
          (item): item is string =>
            typeof item === "string"
        )
      );
    }

    const searchableText = normalizeText(
      searchableParts.join(" ")
    );

    const messageWords = normalizedMessage
      .split(" ")
      .filter((word) => word.length >= 3);

    const score = messageWords.reduce(
      (total, word) =>
        searchableText.includes(word)
          ? total + 1
          : total,
      0
    );

    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}
function getLanguagePrompt(): string {
  return "Please choose your preferred language.";
}
function getConsentPrompt(
  language: "en" | "ar"
): string {
  if (language === "ar") {
    return "رائع! لنكمل استفسارك. سنطرح عليك بعض الأسئلة السريعة حتى يتمكن فريقنا من مساعدتك بشكل أفضل.";
  }

  return "Great! Let’s continue with your enquiry. We’ll ask a few quick questions so our team can assist you better.";
}
function getMainMenu(language: "en" | "ar"): string {
  if (language === "ar") {
    return "كيف يمكننا مساعدتك؟ اختر أحد الخيارات أدناه أو اكتب سؤالك مباشرة.";
  }

  return "How can we help you? Choose an option below or type your question.";
}

function getProgrammesMessage(
  _programmes: WidgetProgramme[],
  language: "en" | "ar"
): string {
  if (language === "ar") {
    return [
      "برامج UCA المتاحة:",
      "",
      "برامج البكالوريوس:",
      "BSc (Hons) Computer Science",
      "https://ucadumylink.vercel.app/programmes/computer-science/",
      "",
      "BSc (Hons) Games Development",
      "https://ucadumylink.vercel.app/programmes/game-development/",
      "",
      "BA (Hons) Graphic Design",
      "https://ucadumylink.vercel.app/programmes/graphic-design/",
      "",
      "BA (Hons) Business & Management",
      "https://ucadumylink.vercel.app/programmes/business-management/",
      "",
      "BA (Hons) Visual Communication",
      "https://ucadumylink.vercel.app/programmes/visual-communication/",
      "",
      "BA (Hons) Digital Marketing & Social Media",
      "https://ucadumylink.vercel.app/programmes/digitalmarketing-socialmedia/",
      "",
      "برنامج الدراسات العليا:",
      "MBA",
      "https://ucadumylink.vercel.app/programmes/mba/",
      "",
      "مسارات الدخول:",
      "Integrated Foundation Year",
      "https://ucadumylink.vercel.app/programmes/integrated-foundation/",
      "",
      "Integrated Pre-Masters",
      "https://ucadumylink.vercel.app/programmes/integrated-premasters/",
      "",
      "اكتب اسم البرنامج الذي تهتم به أو اختر التحدث مع مستشار القبول.",
    ].join("\n");
  }

  return [
    "Explore our UCA programmes",
    "",
    "Undergraduate Programmes",
    "",
    "BSc (Hons) Computer Science",
    "https://ucadumylink.vercel.app/programmes/computer-science/",
    "",
    "BSc (Hons) Games Development",
    "https://ucadumylink.vercel.app/programmes/game-development/",
    "",
    "BA (Hons) Graphic Design",
    "https://ucadumylink.vercel.app/programmes/graphic-design/",
    "",
    "BA (Hons) Business & Management",
    "https://ucadumylink.vercel.app/programmes/business-management/",
    "",
    "BA (Hons) Visual Communication",
    "https://ucadumylink.vercel.app/programmes/visual-communication/",
    "",
    "BA (Hons) Digital Marketing & Social Media",
    "https://ucadumylink.vercel.app/programmes/digitalmarketing-socialmedia/",
    "",
    "Postgraduate Programme",
    "",
    "MBA",
    "https://ucadumylink.vercel.app/programmes/mba/",
    "",
    "Entry Routes",
    "",
    "Integrated Foundation Year",
    "https://ucadumylink.vercel.app/programmes/integrated-foundation/",
    "",
    "Integrated Pre-Masters",
    "https://ucadumylink.vercel.app/programmes/integrated-premasters/",
    "",
    "Type the programme name you are interested in, or choose Speak to an Admissions Advisor for guidance.",
  ].join("\n");
}

function getFeesMessage(
  _programmes: WidgetProgramme[],
  language: "en" | "ar"
): string {
  if (language === "ar") {
    return [
      "الرسوم الدراسية",
      "",
      "برامج البكالوريوس",
      "AED 47,775",
      "شاملة ضريبة القيمة المضافة 5%",
      "",
      "برامج الدراسات العليا",
      "AED 49,775",
      "شاملة ضريبة القيمة المضافة 5%",
      "",
      "Foundation & Pre-Master's",
      "AED 29,775",
      "شاملة ضريبة القيمة المضافة 5%",
      "",
      "عرض البرامج:",
      "https://ucadumylink.vercel.app/Programmes-ucauae/",
    ].join("\n");
  }

  return [
    "Tuition Fees",
    "",
    "Undergraduate Programmes",
    "AED 47,775",
    "Inclusive of 5% VAT",
    "Tuition fee for undergraduate programmes.",
    "",
    "Postgraduate Programmes",
    "AED 49,775",
    "Inclusive of 5% VAT",
    "Tuition fee for postgraduate programmes.",
    "",
    "Foundation & Pre-Master's",
    "AED 29,775",
    "Inclusive of 5% VAT",
    "",
    "View Programmes:",
    "https://ucadumylink.vercel.app/Programmes-ucauae/",
  ].join("\n");
}

function getAdmissionMessage(
  language: "en" | "ar"
): string {
  return language === "ar"
    ? "تختلف متطلبات القبول حسب البرنامج والمؤهل السابق. اختر برنامجاً أو تحدث مع مستشار القبول للحصول على تقييم دقيق."
    : "Admission requirements depend on the programme and your previous qualification. Select a programme or speak with an Admissions Advisor for an accurate assessment.";
}

function getLocationMessage(
  language: "en" | "ar"
): string {
  const mapUrl =
    "https://www.google.com/maps/search/?api=1&query=University+for+the+Creative+Arts+delivered+by+Future+Education+University+College+UAQ%2C+UAQ+FTZ+-+Zone+C+-+Al+Barqaa+-+Emirate+of+Umm+Al+Quwain";

  if (language === "ar") {
    return [
      "University for the Creative Arts delivered by Future Education University College UAQ",
      "UAQ FTZ - Zone C - Al Barqaa",
      "Emirate of Umm Al Quwain, UAE",
      "",
      "فتح الموقع على خرائط Google:",
      mapUrl,
    ].join("\n");
  }

  return [
    "University for the Creative Arts delivered by Future Education University College UAQ",
    "UAQ FTZ - Zone C - Al Barqaa",
    "Emirate of Umm Al Quwain, UAE",
    "",
    "Open in Google Maps:",
    mapUrl,
  ].join("\n");
}

function getNamePrompt(language: "en" | "ar"): string {
  return language === "ar"
    ? "يرجى كتابة اسمك الكامل."
    : "Please enter your full name.";
}

function getPhonePrompt(
  language: "en" | "ar"
): string {
  return language === "ar"
    ? "يرجى إدخال رقم هاتف صالح. يمكنك كتابة الرقم المحلي أو الرقم الدولي مع رمز الدولة.\nأمثلة: +971 00 000 0000 أو 054 000 00"
    : "Please enter a valid phone number. You can use a local number or an international number with country code.\nExamples: +971 00 000 0000, 054 000 0000,  ";
}

function getEmailPrompt(language: "en" | "ar"): string {
  return language === "ar"
    ? "يرجى إدخال بريدك الإلكتروني. يمكنك كتابة تخطي إذا لم ترغب في مشاركته."
    : "Please enter your email address. You may type Skip if you prefer not to share it.";
}

function getCoursePrompt(
  programmes: WidgetProgramme[],
  language: "en" | "ar"
): string {
  if (programmes.length === 0) {
    return language === "ar"
      ? "ما البرنامج أو المجال الذي تهتم به؟"
      : "Which programme or study area are you interested in?";
  }

  return getProgrammesMessage(programmes, language);
}

function getCountryPrompt(language: "en" | "ar"): string {
  return language === "ar"
    ? "ما بلد إقامتك الحالي؟"
    : "What is your current country of residence?";
}

function getWaitingMessage(language: "en" | "ar"): string {
  return language === "ar"
    ? "شكراً لك. تم تحويل استفسارك إلى مستشار القبول. سيقوم أحد أعضاء الفريق بالانضمام إلى المحادثة."
    : "Thank you. Your enquiry has been transferred to a Admissions Advisor. A team member will join the conversation.";
}

function getWhatsAppMessage(language: "en" | "ar"): string {
  return language === "ar"
    ? "يمكنك استخدام زر «المتابعة عبر واتساب» لفتح واتساب والتواصل مع المؤسسة مباشرة."
    : "Use the “Continue on WhatsApp” button to open WhatsApp and contact the institution directly.";
}

function isSkipReply(message: string): boolean {
  const normalized = normalizeText(message);

  return [
    "skip",
    "no email",
    "none",
    "not available",
    "تخطي",
    "لا يوجد",
  ].some(
    (item) =>
      normalized === item ||
      normalized.includes(item)
  );
}

function nextMissingLeadStep({
  context,
  settings,
}: {
  context: WidgetBotContext;
  settings: WidgetBotSettings;
}): WebsiteBotStep | null {
  if (settings.collectName && !context.name) {
    return "ASK_NAME";
  }

  /*
   * Phone remains required for a usable CRM lead and
   * WhatsApp handoff, even when collectPhone is disabled.
   */
  if (!context.phone) {
    return "ASK_PHONE";
  }

  if (
    settings.collectEmail &&
    context.email === undefined
  ) {
    return "ASK_EMAIL";
  }

  if (!context.programmeName) {
    return "ASK_COURSE";
  }

  if (!context.country) {
    return "ASK_COUNTRY";
  }

  return null;
}

function getPromptForStep({
  step,
  language,
  programmes,
}: {
  step: WebsiteBotStep;
  language: "en" | "ar";
  programmes: WidgetProgramme[];
}): string {
  switch (step) {
    case "ASK_NAME":
      return getNamePrompt(language);

    case "ASK_PHONE":
      return getPhonePrompt(language);

    case "ASK_EMAIL":
      return getEmailPrompt(language);

    case "ASK_COURSE":
      return getCoursePrompt(programmes, language);

    case "ASK_COUNTRY":
      return getCountryPrompt(language);

    default:
      return getMainMenu(language);
  }
}

function beginHumanHandoff({
  language,
  context,
  settings,
  programmes,
}: {
  language: "en" | "ar";
  context: WidgetBotContext;
  settings: WidgetBotSettings;
  programmes: WidgetProgramme[];
}): WidgetBotDecision {
  if (!settings.humanHandoffEnabled) {
    return {
      replies: [
        language === "ar"
          ? "خدمة المحادثة المباشرة غير متاحة حالياً. يرجى ترك تفاصيل استفسارك."
          : "Live agent support is currently unavailable. Please leave your enquiry details.",
        getMainMenu(language),
      ],
      nextStep: "MAIN_MENU",
      language,
      contextData: context,
      handoffRequested: false,
      whatsappHandoffRequested: false,
      closeConversation: false,
      leadReady: false,
    };
  }

  const updatedContext: WidgetBotContext = {
    ...context,
    intent: "HUMAN_HANDOFF",
  };

  const missingStep = nextMissingLeadStep({
    context: updatedContext,
    settings,
  });

  if (missingStep) {
    return {
      replies: [
        language === "ar"
          ? "بالتأكيد. قبل تحويل المحادثة، نحتاج إلى بعض التفاصيل."
          : "Certainly. Before transferring the chat, we need a few details.",
        getPromptForStep({
          step: missingStep,
          language,
          programmes,
        }),
      ],
      nextStep: missingStep,
      language,
      contextData: updatedContext,
      handoffRequested: false,
      whatsappHandoffRequested: false,
      closeConversation: false,
      leadReady: false,
    };
  }

  return {
    replies: [getWaitingMessage(language)],
    nextStep: "WAITING_FOR_AGENT",
    language,
    contextData: updatedContext,
    handoffRequested: true,
    whatsappHandoffRequested: false,
    closeConversation: false,
    leadReady: true,
  };
}

export function handleWebsiteBotMessage({
  message,
  currentStep,
  language: currentLanguage,
  contextData,
  settings,
  programmes,
  faqs,
}: HandleWidgetBotInput): WidgetBotDecision {
  const normalizedMessage = message.trim();
  const language =
    currentLanguage === "ar" ? "ar" : "en";

  const context = parseContextData(contextData);

  if (
    isHumanHandoffRequest(normalizedMessage) ||
    normalizeText(normalizedMessage) === "5"
  ) {
    return beginHumanHandoff({
      language,
      context,
      settings,
      programmes,
    });
  }

  if (
    isWhatsAppRequest(normalizedMessage) ||
    normalizeText(normalizedMessage) === "6"
  ) {
    if (!settings.whatsappHandoffEnabled) {
      return {
        replies: [
          language === "ar"
            ? "خيار واتساب غير متاح حالياً."
            : "WhatsApp handoff is currently unavailable.",
          getMainMenu(language),
        ],
        nextStep: "MAIN_MENU",
        language,
        contextData: context,
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }

    return {
      replies: [getWhatsAppMessage(language)],
      nextStep: "MAIN_MENU",
      language,
      contextData: context,
      handoffRequested: false,
      whatsappHandoffRequested: true,
      closeConversation: false,
      leadReady: false,
    };
  }

  switch (currentStep) {
    case "WELCOME": {
      if (settings.enableArabic) {
        return {
          replies: [getLanguagePrompt()],
          nextStep: "LANGUAGE",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      if (settings.requireConsent) {
        return {
          replies: [getConsentPrompt(language)],
          nextStep: "CONSENT",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      return {
        replies: [getMainMenu(language)],
        nextStep: "MAIN_MENU",
        language,
        contextData: {
          ...context,
          consent: true,
        },
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }

    case "LANGUAGE": {
      const selectedLanguage = resolveLanguage(
        language,
        normalizedMessage
      );

      if (settings.requireConsent) {
        return {
          replies: [getConsentPrompt(selectedLanguage)],
          nextStep: "CONSENT",
          language: selectedLanguage,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      return {
        replies: [getMainMenu(selectedLanguage)],
        nextStep: "MAIN_MENU",
        language: selectedLanguage,
        contextData: {
          ...context,
          consent: true,
        },
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }

    case "CONSENT": {
      if (isNegativeReply(normalizedMessage)) {
        return {
          replies: [
            language === "ar"
              ? "لم يتم حفظ بياناتك. يمكنك إغلاق المحادثة."
              : "Your information has not been saved. You may close the chat.",
          ],
          nextStep: "COMPLETED",
          language,
          contextData: {
            ...context,
            consent: false,
          },
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: true,
          leadReady: false,
        };
      }

      if (!isPositiveReply(normalizedMessage)) {
        return {
          replies: [getConsentPrompt(language)],
          nextStep: "CONSENT",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      return {
        replies: [getMainMenu(language)],
        nextStep: "MAIN_MENU",
        language,
        contextData: {
          ...context,
          consent: true,
        },
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }

    case "ASK_NAME": {
      if (normalizedMessage.length < 2) {
        return {
          replies: [getNamePrompt(language)],
          nextStep: "ASK_NAME",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      const updatedContext = {
        ...context,
        name: normalizedMessage.slice(0, 120),
      };

      const nextStep = nextMissingLeadStep({
        context: updatedContext,
        settings,
      });

      if (!nextStep) {
        return beginHumanHandoff({
          language,
          context: updatedContext,
          settings,
          programmes,
        });
      }

      return {
        replies: [
          getPromptForStep({
            step: nextStep,
            language,
            programmes,
          }),
        ],
        nextStep,
        language,
        contextData: updatedContext,
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }

    case "ASK_PHONE": {
      const phoneValidation =
        validatePhoneNumber(normalizedMessage);

      if (
        !phoneValidation.isValid ||
        !phoneValidation.normalizedPhone
      ) {
        return {
          replies: [getInvalidPhoneMessage(language)],
          nextStep: "ASK_PHONE",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      const phone = phoneValidation.normalizedPhone;

      const updatedContext: WidgetBotContext = {
        ...context,
        phone,
      };

      const nextStep = nextMissingLeadStep({
        context: updatedContext,
        settings,
      });

      if (!nextStep) {
        return beginHumanHandoff({
          language,
          context: updatedContext,
          settings,
          programmes,
        });
      }

      return {
        replies: [
          getPromptForStep({
            step: nextStep,
            language,
            programmes,
          }),
        ],
        nextStep,
        language,
        contextData: updatedContext,
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }

    case "ASK_EMAIL": {
      let email: string | undefined;

      if (isSkipReply(normalizedMessage)) {
        email = "";
      } else if (!isValidEmail(normalizedMessage)) {
        return {
          replies: [
            language === "ar"
              ? "البريد الإلكتروني غير صحيح. يرجى إدخال بريد صالح أو كتابة تخطي."
              : "That email address does not appear valid. Enter a valid email or type Skip.",
          ],
          nextStep: "ASK_EMAIL",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      } else {
        email = normalizedMessage
          .toLowerCase()
          .slice(0, 254);
      }

      const updatedContext = {
        ...context,
        email,
      };

      const nextStep = nextMissingLeadStep({
        context: updatedContext,
        settings,
      });

      if (!nextStep) {
        return beginHumanHandoff({
          language,
          context: updatedContext,
          settings,
          programmes,
        });
      }

      return {
        replies: [
          getPromptForStep({
            step: nextStep,
            language,
            programmes,
          }),
        ],
        nextStep,
        language,
        contextData: updatedContext,
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }

    case "ASK_COURSE": {
      const programme = resolveProgramme(
        normalizedMessage,
        programmes
      );

      const updatedContext = {
        ...context,
        programmeId: programme?.id,
        programmeName:
          programme?.name ??
          normalizedMessage.slice(0, 180),
      };

      const nextStep = nextMissingLeadStep({
        context: updatedContext,
        settings,
      });

      if (!nextStep) {
        return beginHumanHandoff({
          language,
          context: updatedContext,
          settings,
          programmes,
        });
      }

      return {
        replies: [
          getPromptForStep({
            step: nextStep,
            language,
            programmes,
          }),
        ],
        nextStep,
        language,
        contextData: updatedContext,
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }

    case "ASK_COUNTRY": {
      if (normalizedMessage.length < 2) {
        return {
          replies: [getCountryPrompt(language)],
          nextStep: "ASK_COUNTRY",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      const updatedContext = {
        ...context,
        country: normalizedMessage.slice(0, 120),
      };

      return beginHumanHandoff({
        language,
        context: updatedContext,
        settings,
        programmes,
      });
    }

    case "WAITING_FOR_AGENT":
    case "AGENT_CONNECTED":
    case "HUMAN_HANDOFF":
      return {
        replies: [],
        nextStep: currentStep,
        language,
        contextData: context,
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };

    case "COMPLETED":
      return {
        replies: [getMainMenu(language)],
        nextStep: "MAIN_MENU",
        language,
        contextData: context,
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };

    case "FAQ":
    case "MAIN_MENU":
    default: {
      if (isProgrammesRequest(normalizedMessage)) {
        return {
          replies: [
            getProgrammesMessage(programmes, language),
          ],
          nextStep: "MAIN_MENU",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      if (isFeesRequest(normalizedMessage)) {
        return {
        replies: [
  getFeesMessage(programmes, language),
],
          nextStep: "MAIN_MENU",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      if (isAdmissionRequest(normalizedMessage)) {
        const faq = findMatchingFaq(
          normalizedMessage,
          language,
          faqs
        );

        return {
          replies: [
            faq?.answer ??
              getAdmissionMessage(language),
          ],
          nextStep: "MAIN_MENU",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      if (isLocationRequest(normalizedMessage)) {
        const faq = findMatchingFaq(
          normalizedMessage,
          language,
          faqs
        );

        return {
          replies: [
  faq?.answer ??
    getLocationMessage(language),
],
          nextStep: "MAIN_MENU",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      const faq = findMatchingFaq(
        normalizedMessage,
        language,
        faqs
      );

      if (faq) {
        return {
          replies: [
            faq.answer,
            language === "ar"
              ? "هل تحتاج إلى مساعدة إضافية؟ يمكنك التحدث مع مستشار القبول."
              : "Need more help? You can ask to speak with a Admissions Advisor.",
          ],
          nextStep: "MAIN_MENU",
          language,
          contextData: context,
          handoffRequested: false,
          whatsappHandoffRequested: false,
          closeConversation: false,
          leadReady: false,
        };
      }

      return {
       replies: [
  language === "ar"
    ? "لم أجد إجابة دقيقة لهذا السؤال. يمكنك اختيار أحد الخيارات أو التحدث مع مستشار القبول."
    : "I could not find an exact answer to that question. Choose an option below or speak with a Admissions Advisor.",
],
        nextStep: "MAIN_MENU",
        language,
        contextData: context,
        handoffRequested: false,
        whatsappHandoffRequested: false,
        closeConversation: false,
        leadReady: false,
      };
    }
  }
}