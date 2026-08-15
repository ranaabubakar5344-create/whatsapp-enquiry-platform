import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Flame,
  Plus,
  Target,
  UserCheck,
  XCircle,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LeadForm from "./LeadForm";
import LeadsTableClient from "./LeadsTableClient";

type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "LOST";


const pipelineStages: Array<{
  value: LeadStatus;
  label: string;
  description: string;
  icon: typeof Target;
  cardClass: string;
  iconClass: string;
}> = [
  {
    value: "NEW",
    label: "New",
    description: "New enquiries",
    icon: Target,
    cardClass: "border-sky-200 bg-sky-50/70",
    iconClass: "bg-white text-sky-600",
  },
  {
    value: "CONTACTED",
    label: "Contacted",
    description: "Customer reached",
    icon: UserCheck,
    cardClass: "border-violet-200 bg-violet-50/70",
    iconClass: "bg-white text-violet-600",
  },
  {
    value: "QUALIFIED",
    label: "Interested",
    description: "Qualified interest",
    icon: Flame,
    cardClass: "border-amber-200 bg-amber-50/70",
    iconClass: "bg-white text-amber-600",
  },
  {
    value: "FOLLOW_UP",
    label: "Follow-up",
    description: "Needs follow-up",
    icon: Clock3,
    cardClass: "border-orange-200 bg-orange-50/70",
    iconClass: "bg-white text-orange-600",
  },
  {
    value: "CONVERTED",
    label: "Converted",
    description: "Successfully converted",
    icon: CheckCircle2,
    cardClass: "border-emerald-200 bg-emerald-50/70",
    iconClass: "bg-white text-emerald-600",
  },
  {
    value: "LOST",
    label: "Lost",
    description: "Closed / lost",
    icon: XCircle,
    cardClass: "border-rose-200 bg-rose-50/70",
    iconClass: "bg-white text-rose-600",
  },
];

export default async function LeadsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    return (
      <main className="p-8">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-bold text-amber-900">
            Company not assigned
          </h1>

          <p className="mt-2 text-sm text-amber-700">
            Your account must be connected to a company before leads can be viewed.
          </p>
        </div>
      </main>
    );
  }

  const leads = await prisma.lead.findMany({
    where: {
      companyId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const counts = pipelineStages.reduce<Record<LeadStatus, number>>(
    (result, stage) => {
      result[stage.value] = leads.filter(
        (lead) => lead.status === stage.value
      ).length;

      return result;
    },
    {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      FOLLOW_UP: 0,
      CONVERTED: 0,
      LOST: 0,
    }
  );

  return (
    <main className="px-5 py-8 sm:px-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Lead Management
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Leads
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Track every enquiry from first contact to conversion.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Leads
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-950">
            {leads.length}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-950">
            Lead Pipeline
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Live overview of every lead stage.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;

            return (
              <div
                key={stage.value}
                className={`rounded-3xl border p-5 ${stage.cardClass}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {stage.label}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-950">
                      {counts[stage.value]}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {stage.description}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${stage.iconClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Plus className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Add new lead
            </h2>

            <p className="text-sm text-slate-500">
              Create a manual customer enquiry.
            </p>
          </div>
        </div>

        <LeadForm />
      </section>
      {
        // cast to any to satisfy TS when the imported component's props are not inferred here
      }
      {(() => {
        const LeadsTableClientAny = LeadsTableClient as any;

        return (
          <LeadsTableClientAny
            leads={leads.map((lead) => ({
              id: lead.id,
              name: lead.name,
              phone: lead.phone,
              email: lead.email,
              country: lead.country,
              courseInterested: lead.courseInterested,
              status: lead.status,
              priority: lead.priority,
              source: lead.source,
              createdAt: lead.createdAt.toISOString(),
            }))}
          />
        );
      })()}
    </main>
  );
}