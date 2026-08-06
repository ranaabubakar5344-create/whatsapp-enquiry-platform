"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  updateWhatsAppSettings,
  type WhatsAppSettingsState,
} from "./actions";

type WhatsAppSettingsFormProps = {
  currentSettings: {
    whatsappNumber: string;
    whatsappPhoneNumberId: string;
    whatsappBusinessAccountId: string;
    hasAccessToken: boolean;
    hasAppSecret: boolean;
    hasVerifyToken: boolean;
  };
};

const initialState: WhatsAppSettingsState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export default function WhatsAppSettingsForm({
  currentSettings,
}: WhatsAppSettingsFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [showAccessToken, setShowAccessToken] =
    useState(false);

  const [showAppSecret, setShowAppSecret] =
    useState(false);

  const [showVerifyToken, setShowVerifyToken] =
    useState(false);

  const [state, formAction, isPending] = useActionState(
    updateWhatsAppSettings,
    initialState
  );

  useEffect(() => {
    if (state.status === "success") {
      const form = formRef.current;

      if (!form) {
        return;
      }

      const accessTokenInput =
        form.elements.namedItem("accessToken");

      const appSecretInput =
        form.elements.namedItem("appSecret");

      const verifyTokenInput =
        form.elements.namedItem("verifyToken");

      if (accessTokenInput instanceof HTMLInputElement) {
        accessTokenInput.value = "";
      }

      if (appSecretInput instanceof HTMLInputElement) {
        appSecretInput.value = "";
      }

      if (verifyTokenInput instanceof HTMLInputElement) {
        verifyTokenInput.value = "";
      }
    }
  }, [state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-8"
    >
      <section className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="whatsappNumber"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            WhatsApp phone number *
          </label>

          <input
            id="whatsappNumber"
            name="whatsappNumber"
            type="text"
            defaultValue={currentSettings.whatsappNumber}
            placeholder="+971501234567"
            className={`h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
              state.fieldErrors?.whatsappNumber
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
          />

          {state.fieldErrors?.whatsappNumber?.[0] ? (
            <p className="mt-2 text-sm font-medium text-red-600">
              {state.fieldErrors.whatsappNumber[0]}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Country code ke saath number enter karein.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="whatsappPhoneNumberId"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Phone Number ID *
          </label>

          <input
            id="whatsappPhoneNumberId"
            name="whatsappPhoneNumberId"
            type="text"
            inputMode="numeric"
            defaultValue={
              currentSettings.whatsappPhoneNumberId
            }
            placeholder="Meta Phone Number ID"
            className={`h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
              state.fieldErrors?.whatsappPhoneNumberId
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
          />

          {state.fieldErrors
            ?.whatsappPhoneNumberId?.[0] ? (
            <p className="mt-2 text-sm font-medium text-red-600">
              {
                state.fieldErrors
                  .whatsappPhoneNumberId[0]
              }
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="whatsappBusinessAccountId"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            WhatsApp Business Account ID *
          </label>

          <input
            id="whatsappBusinessAccountId"
            name="whatsappBusinessAccountId"
            type="text"
            inputMode="numeric"
            defaultValue={
              currentSettings.whatsappBusinessAccountId
            }
            placeholder="WhatsApp Business Account ID"
            className={`h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${
              state.fieldErrors
                ?.whatsappBusinessAccountId
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
          />

          {state.fieldErrors
            ?.whatsappBusinessAccountId?.[0] ? (
            <p className="mt-2 text-sm font-medium text-red-600">
              {
                state.fieldErrors
                  .whatsappBusinessAccountId[0]
              }
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-950">
              Secure Meta credentials
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Saved credentials dobara screen par show nahi
              honge. Update karne ke liye new value enter
              karein.
            </p>
          </div>
        </div>

        <div className="grid gap-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="accessToken"
                className="block text-sm font-semibold text-slate-700"
              >
                Permanent Access Token
              </label>

              {currentSettings.hasAccessToken ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved
                </span>
              ) : null}
            </div>

            <div className="relative">
              <input
                id="accessToken"
                name="accessToken"
                type={showAccessToken ? "text" : "password"}
                placeholder={
                  currentSettings.hasAccessToken
                    ? "Leave blank to keep saved token"
                    : "Paste permanent access token"
                }
                autoComplete="new-password"
                className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                  state.fieldErrors?.accessToken
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
                }`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowAccessToken((current) => !current)
                }
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label={
                  showAccessToken
                    ? "Hide access token"
                    : "Show access token"
                }
              >
                {showAccessToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {state.fieldErrors?.accessToken?.[0] ? (
              <p className="mt-2 text-sm font-medium text-red-600">
                {state.fieldErrors.accessToken[0]}
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="appSecret"
                className="block text-sm font-semibold text-slate-700"
              >
                Meta App Secret
              </label>

              {currentSettings.hasAppSecret ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved
                </span>
              ) : null}
            </div>

            <div className="relative">
              <input
                id="appSecret"
                name="appSecret"
                type={showAppSecret ? "text" : "password"}
                placeholder={
                  currentSettings.hasAppSecret
                    ? "Leave blank to keep saved secret"
                    : "Paste Meta App Secret"
                }
                autoComplete="new-password"
                className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                  state.fieldErrors?.appSecret
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
                }`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowAppSecret((current) => !current)
                }
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label={
                  showAppSecret
                    ? "Hide app secret"
                    : "Show app secret"
                }
              >
                {showAppSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {state.fieldErrors?.appSecret?.[0] ? (
              <p className="mt-2 text-sm font-medium text-red-600">
                {state.fieldErrors.appSecret[0]}
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="verifyToken"
                className="block text-sm font-semibold text-slate-700"
              >
                Webhook Verify Token
              </label>

              {currentSettings.hasVerifyToken ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved
                </span>
              ) : null}
            </div>

            <div className="relative">
              <input
                id="verifyToken"
                name="verifyToken"
                type={showVerifyToken ? "text" : "password"}
                placeholder={
                  currentSettings.hasVerifyToken
                    ? "Leave blank to keep saved verify token"
                    : "Create a strong verify token"
                }
                autoComplete="new-password"
                className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:ring-4 ${
                  state.fieldErrors?.verifyToken
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
                }`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowVerifyToken((current) => !current)
                }
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label={
                  showVerifyToken
                    ? "Hide verify token"
                    : "Show verify token"
                }
              >
                {showVerifyToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {state.fieldErrors?.verifyToken?.[0] ? (
              <p className="mt-2 text-sm font-medium text-red-600">
                {state.fieldErrors.verifyToken[0]}
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <KeyRound className="h-3.5 w-3.5" />
                Ye token Meta webhook setup mein bhi use hoga.
              </p>
            )}
          </div>
        </div>
      </section>

      {state.message ? (
        <div
          role="alert"
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
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-4 w-4" />

        {isPending
          ? "Saving Settings..."
          : "Save WhatsApp Settings"}
      </button>
    </form>
  );
}