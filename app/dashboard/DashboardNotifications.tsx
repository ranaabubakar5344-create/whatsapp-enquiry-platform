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

type EnquiriesResponse = {
  success: boolean;
  error?: string;

  data?: {
    count: number;
    enquiries: Enquiry[];
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

  const initializedRef = useRef(false);

  const knownEnquiryIdsRef = useRef<
    Set<string>
  >(new Set());

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const toastTimeoutRef =
    useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(
      "/sounds/widget-notification.wav"
    );

    audio.preload = "auto";
    audio.volume = 0.55;

    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;

      if (toastTimeoutRef.current) {
        window.clearTimeout(
          toastTimeoutRef.current
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

  const loadEnquiries =
    useCallback(async () => {
      try {
        const response = await fetch(
          "/api/dashboard/enquiries",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result =
          (await response.json()) as
            EnquiriesResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          return;
        }

        const receivedEnquiries =
          result.data.enquiries;

        const receivedIds = new Set(
          receivedEnquiries.map(
            (enquiry) => enquiry.id
          )
        );

        if (!initializedRef.current) {
          initializedRef.current = true;

          knownEnquiryIdsRef.current =
            receivedIds;

          setEnquiries(
            receivedEnquiries
          );

          return;
        }

        const newlyReceived =
          receivedEnquiries.find(
            (enquiry) =>
              !knownEnquiryIdsRef.current.has(
                enquiry.id
              )
          );

        knownEnquiryIdsRef.current =
          receivedIds;

        setEnquiries(receivedEnquiries);

        if (newlyReceived) {
          showNewEnquiryNotification(
            newlyReceived
          );
        }
      } catch (error) {
        console.error(
          "Enquiry notification error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }, [showNewEnquiryNotification]);

  useEffect(() => {
    void loadEnquiries();

    const interval = window.setInterval(
      () => {
        void loadEnquiries();
      },
      5000
    );

    return () => {
      window.clearInterval(interval);
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

          {enquiries.length > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {enquiries.length > 99
                ? "99+"
                : enquiries.length}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-14 z-50 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Enquiries
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Customers waiting for assistance
                </p>
              </div>

              {enquiries.length > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                  {enquiries.length} waiting
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
                  Loading enquiries...
                </div>
              ) : enquiries.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    ✓
                  </div>

                  <p className="mt-3 text-sm font-bold text-slate-800">
                    No waiting enquiries
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    New enquiries will appear here.
                  </p>
                </div>
              ) : (
                enquiries.map((enquiry) => (
                  <button
                    key={enquiry.id}
                    type="button"
                    onClick={() =>
                      openEnquiry(enquiry)
                    }
                    className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {enquiry.customerName
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {enquiry.customerName}
                        </p>

                        <span className="shrink-0 text-[10px] text-slate-400">
                          {formatWaitingTime(
                            enquiry.lastMessageAt
                          )}
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
                ))
              )}
            </div>
          </div>
        )}
      </div>

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
                A customer is waiting for assistance.
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