"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        redirectTo: "/dashboard",
      });

      if (!result?.ok) {
        setError("Invalid email or password.");
        return;
      }

      router.push(result.url ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
      <div className="mb-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-bold text-white">
          W
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          WhatsApp Enquiry Platform
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Welcome back
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in to manage companies, leads and WhatsApp conversations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            autoComplete="email"
            required
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}