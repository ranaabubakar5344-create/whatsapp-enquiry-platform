"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Enquiry = {
  id: string;
  leadId: string | null;
  customerName: string;
  customerPhone: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
};

type FollowUpReminder = {
  conversationId: string;
  customerName: string;
  customerPhone: string;
  followUpAt: string;
  note: string | null;
  createdByName: string | null;
};

type EnquiriesResponse = {
  success: boolean;
  error?: string;

  data?: {
    count: number;
    waitingCount?: number;
    reminderCount?: number;
    enquiries: Enquiry[];
    reminders?: FollowUpReminder[];
  };
};

function formatWaitingTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes = Math.max(
    0,
    Math.floor(difference / 60_000)
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes === 1) {
    return "1 minute ago";
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours === 1) {
    return "1 hour ago";
  }

  return `${hours} hours ago`;
}

export default function DashboardNotifications() {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [enquiries, setEnquiries] =
    useState<Enquiry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [newEnquiry, setNewEnquiry] =
    useState<Enquiry | null>(null);

  const [reminders, setReminders] =
    useState<FollowUpReminder[]>([]);

  const [newReminder, setNewReminder] =
    useState<FollowUpReminder | null>(null);

  const initializedRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const abortControllerRef =
    useRef<AbortController | null>(null);

  const knownEnquiryIdsRef = useRef<
    Set<string>
  >(new Set());

  const knownReminderKeysRef = useRef<
    Set<string>
  >(new Set());

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const toastTimeoutRef =
    useRef<number | null>(null);

  const dashboardRefreshTimeoutRef =
    useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(
      "/sounds/widget-notification.wav"
    );

    audio.preload = "auto";
    audio.volume = 0.55;

    audioRef.current = audio;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();

      audio.pause();
      audioRef.current = null;

      if (toastTimeoutRef.current) {
        window.clearTimeout(
          toastTimeoutRef.current
        );
      }

      if (dashboardRefreshTimeoutRef.current) {
        window.clearTimeout(
          dashboardRefreshTimeoutRef.current
        );
      }
    };
  }, []);

  const playNotificationSound =
    useCallback(() => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      audio.currentTime = 0;

      void audio.play().catch(() => {
        // Browser sound ko block kar sakta hai
        // jab tak user dashboard par click na kare.
      });
    }, []);

  const showNewEnquiryNotification =
    useCallback(
      (enquiry: Enquiry) => {
        setNewEnquiry(enquiry);
        playNotificationSound();

        if (
          typeof Notification !==
            "undefined" &&
          Notification.permission === "granted"
        ) {
          const notification =
            new Notification(
              "New Enquiry Received",
              {
                body: `${enquiry.customerName} is waiting for assistance.`,
                icon: "/favicon.ico",
              }
            );

          notification.onclick = () => {
            window.focus();

            router.push(
              `/dashboard/chats/${enquiry.id}`
            );

            notification.close();
          };
        }

        if (toastTimeoutRef.current) {
          window.clearTimeout(
            toastTimeoutRef.current
          );
        }

        toastTimeoutRef.current =
          window.setTimeout(() => {
            setNewEnquiry(null);
          }, 7000);
      },
      [playNotificationSound, router]
    );

  const showFollowUpNotification =
    useCallback(
      (reminder: FollowUpReminder) => {
        setNewReminder(reminder);
        playNotificationSound();

        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          const notification = new Notification(
            "Follow-up Reminder Due",
            {
              body: `${reminder.customerName} is due for follow-up.`,
              icon: "/favicon.ico",
            }
          );

          notification.onclick = () => {
            window.focus();
            router.push(
              `/dashboard/chats/${reminder.conversationId}`
            );
            notification.close();
          };
        }

        if (toastTimeoutRef.current) {
          window.clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = window.setTimeout(() => {
          setNewReminder(null);
        }, 9000);
      },
      [playNotificationSound, router]
    );

  const loadEnquiries =
    useCallback(async () => {
      if (
        requestInFlightRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      requestInFlightRef.current = true;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(
          "/api/dashboard/enquiries",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        /*
         * During a Next.js dev rebuild/restart, an API request can
         * temporarily receive an HTML error page. Never call
         * response.json() blindly because "<!DOCTYPE..." causes
         * "Unexpected token '<'".
         */
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
          (await response.json()) as
            EnquiriesResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data ||
          !Array.isArray(result.data.enquiries)
        ) {
          return;
        }

        if (!mountedRef.current) {
          return;
        }

        const receivedEnquiries =
          result.data.enquiries;

        const receivedReminders =
          Array.isArray(result.data.reminders)
            ? result.data.reminders
            : [];

        const receivedIds = new Set(
          receivedEnquiries.map(
            (enquiry) => enquiry.id
          )
        );

        const reminderKeys = new Set(
          receivedReminders.map(
            (reminder) =>
              `${reminder.conversationId}:${reminder.followUpAt}`
          )
        );

        if (!initializedRef.current) {
          initializedRef.current = true;

          knownEnquiryIdsRef.current =
            receivedIds;
          knownReminderKeysRef.current =
            reminderKeys;

          setEnquiries(receivedEnquiries);
          setReminders(receivedReminders);

          return;
        }

        const newlyReceived =
          receivedEnquiries.find(
            (enquiry) =>
              !knownEnquiryIdsRef.current.has(
                enquiry.id
              )
          );

        const newlyDueReminder =
          receivedReminders.find(
            (reminder) =>
              !knownReminderKeysRef.current.has(
                `${reminder.conversationId}:${reminder.followUpAt}`
              )
          );

        knownEnquiryIdsRef.current = receivedIds;
        knownReminderKeysRef.current = reminderKeys;

        setEnquiries(receivedEnquiries);
        setReminders(receivedReminders);

        if (newlyReceived) {
          showNewEnquiryNotification(newlyReceived);

          /*
           * Keep the original notification alert fully visible first.
           * Refresh only after the 7-second enquiry toast has finished,
           * so router.refresh() cannot immediately wipe/remount the alert.
           */
          if (dashboardRefreshTimeoutRef.current) {
            window.clearTimeout(
              dashboardRefreshTimeoutRef.current
            );
          }

          dashboardRefreshTimeoutRef.current =
            window.setTimeout(() => {
              router.refresh();
            }, 7500);
        }

        if (newlyDueReminder) {
          showFollowUpNotification(newlyDueReminder);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        /*
         * A brief fetch failure during hot reload/server restart is
         * harmless. Keep the current notification state and retry on
         * the next polling cycle instead of crashing/log-spamming.
         */
        if (navigator.onLine) {
          console.warn(
            "Enquiry notification refresh temporarily unavailable."
          );
        }
      } finally {
        requestInFlightRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, [
      router,
      showNewEnquiryNotification,
      showFollowUpNotification,
    ]);

  useEffect(() => {
    mountedRef.current = true;

    const refresh = () => {
      if (
        document.visibilityState === "visible"
      ) {
        void loadEnquiries();
      }
    };

    refresh();

    const interval = window.setInterval(
      refresh,
      5000
    );

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    window.addEventListener(
      "focus",
      refresh
    );

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

      abortControllerRef.current?.abort();
    };
  }, [loadEnquiries]);

  async function enableDesktopNotifications() {
    if (
      typeof Notification ===
      "undefined"
    ) {
      return;
    }

    await Notification.requestPermission();
  }

  function openEnquiry(enquiry: Enquiry) {
    setOpen(false);
    setNewEnquiry(null);

    router.push(
      `/dashboard/chats/${enquiry.id}`
    );
  }

  function openReminder(reminder: FollowUpReminder) {
    setOpen(false);
    setNewReminder(null);

    router.push(
      `/dashboard/chats/${reminder.conversationId}`
    );
  }

  const totalNotifications =
    enquiries.length + reminders.length;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpen((current) => !current)
          }
          aria-label="Open notifications"
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>

          {totalNotifications > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {totalNotifications > 99
                ? "99+"
                : totalNotifications}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-14 z-50 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Notifications
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Enquiries and follow-up reminders
                </p>
              </div>

              {totalNotifications > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                  {totalNotifications} alert{totalNotifications === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {typeof Notification !==
              "undefined" &&
              Notification.permission ===
                "default" && (
                <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={
                      enableDesktopNotifications
                    }
                    className="text-xs font-bold text-blue-700"
                  >
                    Enable desktop alerts
                  </button>
                </div>
              )}

            <div className="max-h-[390px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Loading notifications...
                </div>
              ) : totalNotifications === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    ✓
                  </div>

                  <p className="mt-3 text-sm font-bold text-slate-800">
                    No active alerts
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    New enquiries and due follow-ups will appear here.
                  </p>
                </div>
              ) : (
                <>
                  {reminders.length > 0 && (
                    <div>
                      <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-red-700">
                        Follow-up due · {reminders.length}
                      </div>

                      {reminders.map((reminder) => (
                        <button
                          key={`${reminder.conversationId}:${reminder.followUpAt}`}
                          type="button"
                          onClick={() => openReminder(reminder)}
                          className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-red-50/50"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg text-red-700">
                            ⏰
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {reminder.customerName}
                              </p>
                              <span className="shrink-0 text-[10px] font-semibold text-red-500">
                                Due {formatWaitingTime(reminder.followUpAt)}
                              </span>
                            </div>

                            {reminder.note && (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                {reminder.note}
                              </p>
                            )}

                            <p className="mt-2 text-xs font-bold text-red-600">
                              Follow-up required
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {enquiries.length > 0 && (
                    <div>
                      <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                        Waiting enquiries · {enquiries.length}
                      </div>

                      {enquiries.map((enquiry) => (
                        <button
                          key={enquiry.id}
                          type="button"
                          onClick={() => openEnquiry(enquiry)}
                          className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                            {enquiry.customerName.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {enquiry.customerName}
                              </p>

                              <span className="shrink-0 text-[10px] text-slate-400">
                                {formatWaitingTime(enquiry.lastMessageAt)}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {enquiry.customerPhone}
                            </p>

                            <p className="mt-2 text-xs font-bold text-amber-600">
                              Waiting for Marketing Executive
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {newReminder && (
        <div className="fixed right-5 top-24 z-[101] w-[350px] overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl text-red-700">
              ⏰
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900">
                Follow-up Reminder Due
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                {newReminder.customerName}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                {newReminder.note ?? "This customer is due for follow-up."}
              </p>
              <button
                type="button"
                onClick={() => openReminder(newReminder)}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
              >
                Open Follow-up
              </button>
            </div>

            <button
              type="button"
              onClick={() => setNewReminder(null)}
              className="text-slate-400 transition hover:text-slate-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {newEnquiry && (
        <div className="fixed right-5 top-24 z-[100] w-[350px] overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900">
                New Enquiry Received
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                {newEnquiry.customerName}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                A USER is waiting for assistance.
              </p>

              <button
                type="button"
                onClick={() =>
                  openEnquiry(newEnquiry)
                }
                className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                View Enquiry
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setNewEnquiry(null)
              }
              className="text-slate-400 transition hover:text-slate-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}