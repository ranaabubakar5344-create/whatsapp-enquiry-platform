"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Users,
} from "lucide-react";

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  courseInterested: string | null;
  status: string;
  createdAt: string;
};

type RecentLeadsProps = {
  leads: Lead[];
};

function statusLabel(status: string) {
  switch (status) {
    case "NEW":
      return "New";
    case "CONTACTED":
      return "Contacted";
    case "QUALIFIED":
      return "Interested";
    case "FOLLOW_UP":
      return "Follow-up";
    case "CONVERTED":
      return "Converted";
    case "LOST":
      return "Lost";
    default:
      return status.replaceAll("_", " ");
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "NEW":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "CONTACTED":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "QUALIFIED":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "FOLLOW_UP":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "CONVERTED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "LOST":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export default function RecentLeads({
  leads,
}: RecentLeadsProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleLeads = showAll
    ? leads
    : leads.slice(0, 5);

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Recent Leads
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest enquiries received. Newest lead appears first.
          </p> 
        </div>

        <Link
          href="/dashboard/leads"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          View All Leads
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Users className="h-6 w-6" />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            No leads received yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            New website and chatbot enquiries will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Lead Name
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Phone
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Programme
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
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
                {visibleLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {lead.name ?? "Unknown customer"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {lead.phone}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {lead.courseInterested ?? "Not selected"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClasses(
                          lead.status
                        )}`}
                      >
                        {statusLabel(lead.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(
                        lead.createdAt
                      ).toLocaleString("en-GB")}
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leads.length > 5 && (
            <div className="border-t border-slate-200 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setShowAll((current) => !current)
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                {showAll ? (
                  <>
                    Show Less
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    See More Leads ({leads.length - 5})
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}