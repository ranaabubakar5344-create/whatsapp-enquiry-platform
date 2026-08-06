"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import {
  updateLead,
  type LeadActionState,
} from "../actions";

type Agent = {
  id: string;
  name: string;
  email: string;
};

type LeadData = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  country: string | null;
  courseInterested: string | null;
  status:
    | "NEW"
    | "CONTACTED"
    | "QUALIFIED"
    | "FOLLOW_UP"
    | "CONVERTED"
    | "LOST";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignedToId: string | null;
  remarks: string | null;
};

const initialState: LeadActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export default function LeadEditForm({
  lead,
  agents,
}: {
  lead: LeadData;
  agents: Agent[];
}) {
  const [state, formAction, isPending] = useActionState(
    updateLead,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="leadId" value={lead.id} />

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Customer name
          </label>

          <input
            name="name"
            type="text"
            defaultValue={lead.name ?? ""}
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Phone number *
          </label>

          <input
            name="phone"
            type="text"
            defaultValue={lead.phone}
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />

          {state.fieldErrors?.phone?.[0] ? (
            <p className="mt-2 text-sm text-red-600">
              {state.fieldErrors.phone[0]}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Email address
          </label>

          <input
            name="email"
            type="email"
            defaultValue={lead.email ?? ""}
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Country
          </label>

          <input
            name="country"
            type="text"
            defaultValue={lead.country ?? ""}
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Programme / service
          </label>

          <input
            name="courseInterested"
            type="text"
            defaultValue={lead.courseInterested ?? ""}
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Lead status
          </label>

          <select
            name="status"
            defaultValue={lead.status}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Priority
          </label>

          <select
            name="priority"
            defaultValue={lead.priority}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Assign agent
          </label>

          <select
            name="assignedToId"
            defaultValue={lead.assignedToId ?? ""}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="">Not assigned</option>

            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} — {agent.email}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Remarks
          </label>

          <textarea
            name="remarks"
            defaultValue={lead.remarks ?? ""}
            rows={5}
            placeholder="Add follow-up notes or customer details..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {state.message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {isPending ? "Updating..." : "Update Lead"}
      </button>
    </form>
  );
}