"use client";

import { Power, Trash2 } from "lucide-react";

import {
  deleteAgent,
  toggleAgentStatus,
} from "./actions";

type AgentActionsProps = {
  agentId: string;
  isActive: boolean;
};

export default function AgentActions({
  agentId,
  isActive,
}: AgentActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <form action={toggleAgentStatus}>
        <input type="hidden" name="agentId" value={agentId} />

        <button
          type="submit"
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${
            isActive
              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          <Power className="h-4 w-4" />

          {isActive ? "Deactivate" : "Activate"}
        </button>
      </form>

      <form action={deleteAgent}>
        <input type="hidden" name="agentId" value={agentId} />

        <button
          type="submit"
          onClick={(event) => {
            const confirmed = window.confirm(
              "Are you sure you want to delete this agent?"
            );

            if (!confirmed) {
              event.preventDefault();
            }
          }}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </form>
    </div>
  );
}