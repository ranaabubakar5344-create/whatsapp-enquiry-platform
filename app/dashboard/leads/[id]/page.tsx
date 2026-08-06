import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteLead } from "../actions";
import DeleteLeadButton from "./DeleteLeadButton";
import LeadEditForm from "./LeadEditForm";

type LeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LeadPage({
  params,
}: LeadPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    redirect("/dashboard/leads");
  }

  const { id } = await params;

  const [lead, agents] = await Promise.all([
    prisma.lead.findFirst({
      where: {
        id,
        companyId,
      },
    }),

    prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  if (!lead) {
    notFound();
  }

  return (
    <main className="px-5 py-8 sm:px-8">
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </Link>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Lead details
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              {lead.name ?? "Unknown customer"}
            </h1>

            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              Created {lead.createdAt.toLocaleDateString("en-GB")}
            </div>
          </div>

          <form action={deleteLead}>
            <input type="hidden" name="leadId" value={lead.id} />
            <DeleteLeadButton />
          </form>
        </div>

        <div className="mt-8">
          <LeadEditForm
            lead={{
              id: lead.id,
              name: lead.name,
              phone: lead.phone,
              email: lead.email,
              country: lead.country,
              courseInterested: lead.courseInterested,
              status: lead.status,
              priority: lead.priority,
              assignedToId: lead.assignedToId,
              remarks: lead.remarks,
            }}
            agents={agents}
          />
        </div>
      </section>
    </main>
  );
}