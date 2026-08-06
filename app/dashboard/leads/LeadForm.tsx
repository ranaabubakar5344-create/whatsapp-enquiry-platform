"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";

import {
  createLead,
  type LeadActionState,
} from "./actions";

const initialState: LeadActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export default function LeadForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    createLead,
    initialState
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Customer name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          placeholder="Enter full name"
          className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />

        {state.fieldErrors?.name?.[0] ? (
          <p className="mt-2 text-sm font-medium text-red-600">
            {state.fieldErrors.name[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Phone number *
        </label>

        <input
          id="phone"
          name="phone"
          type="text"
          placeholder="+971..."
          className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 ${
            state.fieldErrors?.phone
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
              : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
          }`}
        />

        {state.fieldErrors?.phone?.[0] ? (
          <p className="mt-2 text-sm font-medium text-red-600">
            {state.fieldErrors.phone[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Email address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          placeholder="customer@example.com"
          className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 ${
            state.fieldErrors?.email
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
              : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
          }`}
        />

        {state.fieldErrors?.email?.[0] ? (
          <p className="mt-2 text-sm font-medium text-red-600">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="country"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Country
        </label>

        <input
          id="country"
          name="country"
          type="text"
          placeholder="United Arab Emirates"
          className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      <div>
        <label
          htmlFor="courseInterested"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Programme / service
        </label>

        <input
          id="courseInterested"
          name="courseInterested"
          type="text"
          placeholder="MBA, Computing..."
          className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      <div>
        <label
          htmlFor="priority"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Priority
        </label>

        <select
          id="priority"
          name="priority"
          defaultValue="MEDIUM"
          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      <div className="md:col-span-2 xl:col-span-3">
        {state.message ? (
          <div
            role="alert"
            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
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
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />

          {isPending ? "Saving Lead..." : "Save Lead"}
        </button>
      </div>
    </form>
  );
}