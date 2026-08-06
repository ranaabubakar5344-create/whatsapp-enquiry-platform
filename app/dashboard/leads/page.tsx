import { redirect } from "next/navigation";
import Link from "next/link";

import {
  Eye,
  Mail,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LeadForm from "./LeadForm";

function statusClasses(status: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-50 text-blue-700";
    case "CONTACTED":
      return "bg-amber-50 text-amber-700";
    case "QUALIFIED":
      return "bg-purple-50 text-purple-700";
    case "FOLLOW_UP":
      return "bg-orange-50 text-orange-700";
    case "CONVERTED":
      return "bg-emerald-50 text-emerald-700";
    case "LOST":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function priorityClasses(priority: string) {
  switch (priority) {
    case "URGENT":
      return "bg-red-50 text-red-700";
    case "HIGH":
      return "bg-orange-50 text-orange-700";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

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

  return (
    <main className="px-5 py-8 sm:px-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Lead Management
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Leads
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage website and WhatsApp customer enquiries.
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

  <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
  <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-lg font-bold text-slate-950">
        All leads
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Latest enquiries from all lead sources.
      </p>
    </div>

    <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-slate-400">
      <Search className="h-4 w-4" />

      <span className="text-sm">
        Search and filters coming next
      </span>
    </div>
  </div>

  {leads.length === 0 ? (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Users className="h-6 w-6" />
      </div>

      <h3 className="mt-4 font-bold text-slate-900">
        No leads available
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        Add the first lead using the form above.
      </p>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px]">
        <thead>
            
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer
            </th>

            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Contact
            </th>

            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Programme
            </th>

            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Status
            </th>

            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Priority
            </th>

            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Source
            </th>

            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Date
            </th>

            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
  {leads.map((lead) => (
    <tr
      key={lead.id}
      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
    >
      <td className="px-6 py-4">
        <p className="text-sm font-bold text-slate-900">
          {lead.name ?? "Unknown customer"}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {lead.country ?? "Country not provided"}
        </p>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Phone className="h-4 w-4 text-slate-400" />
          {lead.phone}
        </div>

        {lead.email ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Mail className="h-3.5 w-3.5" />
            {lead.email}
          </div>
        ) : null}
      </td>

      <td className="px-6 py-4 text-sm text-slate-600">
        {lead.courseInterested ?? "Not selected"}
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
            lead.status
          )}`}
        >
          {lead.status.replaceAll("_", " ")}
        </span>
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClasses(
            lead.priority
          )}`}
        >
          {lead.priority}
        </span>
      </td>

      <td className="px-6 py-4 text-sm text-slate-600">
        {lead.source}
      </td>

      <td className="px-6 py-4 text-sm text-slate-500">
        {lead.createdAt.toLocaleDateString("en-GB")}
      </td>

      <td className="px-6 py-4">
        <Link
          href={`/dashboard/leads/${lead.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Eye className="h-4 w-4" />
          View
        </Link>
      </td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  )}
</section>
    </main>
  );
}