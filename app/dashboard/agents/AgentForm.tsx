"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";

import {
  createAgent,
  type AgentActionState,
} from "./actions";

const initialState: AgentActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export default function AgentForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    createAgent,
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
          htmlFor="agent-name"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Agent name *
        </label>

        <input
          id="agent-name"
          name="name"
          type="text"
          placeholder="Enter agent name"
          className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 ${
            state.fieldErrors?.name
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
              : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
          }`}
        />

        {state.fieldErrors?.name?.[0] ? (
          <p className="mt-2 text-sm font-medium text-red-600">
            {state.fieldErrors.name[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="agent-email"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Email address *
        </label>

        <input
          id="agent-email"
          name="email"
          type="email"
          placeholder="agent@example.com"
          autoComplete="off"
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
          htmlFor="agent-password"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Temporary password *
        </label>

        <input
          id="agent-password"
          name="password"
          type="password"
          placeholder="Minimum 10 characters"
          autoComplete="new-password"
          className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 ${
            state.fieldErrors?.password
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
              : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
          }`}
        />

        {state.fieldErrors?.password?.[0] ? (
          <p className="mt-2 text-sm font-medium text-red-600">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
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
          <UserPlus className="h-4 w-4" />

          {isPending ? "Creating Agent..." : "Create Agent"}
        </button>
      </div>
    </form>
  );
}