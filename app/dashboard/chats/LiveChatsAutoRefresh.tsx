"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type LiveChatsAutoRefreshProps = {
  intervalMs?: number;
};

export default function LiveChatsAutoRefresh({
  intervalMs = 5000,
}: LiveChatsAutoRefreshProps) {
  const router = useRouter();
  const refreshInProgressRef = useRef(false);

  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState !== "visible" ||
        refreshInProgressRef.current
      ) {
        return;
      }

      refreshInProgressRef.current = true;

      try {
        router.refresh();
      } finally {
        window.setTimeout(() => {
          refreshInProgressRef.current = false;
        }, 1200);
      }
    };

    const interval = window.setInterval(
      refresh,
      Math.max(intervalMs, 3000)
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("focus", refresh);
    };
  }, [intervalMs, router]);

  return null;
}
