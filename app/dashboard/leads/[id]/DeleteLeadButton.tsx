"use client";

import { Trash2 } from "lucide-react";

export default function DeleteLeadButton() {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm(
          "Are you sure you want to delete this lead?"
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100"
    >
      <Trash2 className="h-4 w-4" />
      Delete Lead
    </button>
  );
}