"use client";

import { useActionState, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Flame,
  Save,
  Target,
  UserCheck,
  XCircle,
} from "lucide-react";

import {
  updateLead,
  type LeadActionState,
} from "../actions";

type Agent = {
  id: string;
  name: string;
  email: string;
};

type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "LOST";

type LeadData = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  country: string | null;
  courseInterested: string | null;
  status: LeadStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignedToId: string | null;
  remarks: string | null;
};

const initialState: LeadActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

const pipeline: Array<{
  value: LeadStatus;
  label: string;
  description: string;
  icon: typeof Target;
  activeClass: string;
}> = [
  {
    value: "NEW",
    label: "New",
    description: "New enquiry",
    icon: Target,
    activeClass:
      "border-sky-300 bg-sky-50 text-sky-800 ring-sky-200",
  },
  {
    value: "CONTACTED",
    label: "Contacted",
    description: "Customer contacted",
    icon: UserCheck,
    activeClass:
      "border-violet-300 bg-violet-50 text-violet-800 ring-violet-200",
  },
  {
    value: "QUALIFIED",
    label: "Interested",
    description: "Customer is interested",
    icon: Flame,
    activeClass:
      "border-amber-300 bg-amber-50 text-amber-800 ring-amber-200",
  },
  {
    value: "FOLLOW_UP",
    label: "Follow-up",
    description: "Needs follow-up",
    icon: Clock3,
    activeClass:
      "border-orange-300 bg-orange-50 text-orange-800 ring-orange-200",
  },
  {
    value: "CONVERTED",
    label: "Converted",
    description: "Successfully converted",
    icon: CheckCircle2,
    activeClass:
      "border-emerald-300 bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  {
    value: "LOST",
    label: "Lost",
    description: "Lead closed/lost",
    icon: XCircle,
    activeClass:
      "border-rose-300 bg-rose-50 text-rose-800 ring-rose-200",
  },
];

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

  const [selectedStatus, setSelectedStatus] =
    useState<LeadStatus>(lead.status);

  return (
    <form action={formAction} className="space-y-7">
      <input type="hidden" name="leadId" value={lead.id} />
      <input
        type="hidden"
        name="status"
        value={selectedStatus}
      />

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
            Lead Pipeline
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Move this lead through the sales journey
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Click a stage below, then save the lead.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pipeline.map((stage) => {
            const Icon = stage.icon;
            const isActive =
              selectedStatus === stage.value;

            return (
              <button
                key={stage.value}
                type="button"
                onClick={() =>
                  setSelectedStatus(stage.value)
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? `${stage.activeClass} ring-2`
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-white/80"
                        : "bg-slate-100"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold">
                      {stage.label}
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        isActive
                          ? "opacity-80"
                          : "text-slate-500"
                      }`}
                    >
                      {stage.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Lead name
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
            Current lead status
          </label>

          <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
            {pipeline.find(
              (stage) =>
                stage.value === selectedStatus
            )?.label ?? selectedStatus}
          </div>
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
            <option value="">
              Not assigned
            </option>

            {agents.map((agent) => (
              <option
                key={agent.id}
                value={agent.id}
              >
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

        {isPending
          ? "Updating..."
          : "Update Lead"}
      </button>
    </form>
  );
}