import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Eye,
  MessageCircle,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

export default async function DashboardPage() {
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
            This account is not currently connected to a company.
          </p>
        </div>
      </main>
    );
  }

  const [
    totalLeads,
    newLeads,
    activeConversations,
    activeAgents,
    recentLeads,
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        companyId,
      },
    }),

    prisma.lead.count({
      where: {
        companyId,
        status: "NEW",
      },
    }),

    prisma.conversation.count({
      where: {
        companyId,
        status: {
          in: [
            "BOT_ACTIVE",
            "WAITING_FOR_AGENT",
            "AGENT_ACTIVE",
          ],
        },
      },
    }),

    prisma.user.count({
      where: {
        companyId,
        isActive: true,
      },
    }),

    prisma.lead.findMany({
      where: {
        companyId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        phone: true,
        courseInterested: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const cards = [
    {
      label: "Total Leads",
      value: totalLeads,
      description: "All enquiries in the CRM",
      actionLabel: "View all leads",
      href: "/dashboard/leads",
      icon: Users,
    },
    {
      label: "New Leads",
      value: newLeads,
      description: "New leads waiting for action",
      actionLabel: "View leads",
      href: "/dashboard/leads",
      icon: UserPlus,
    },
    {
      label: "Active Conversations",
      value: activeConversations,
      description: "Bot and agent conversations",
      actionLabel: "View live chats",
      href: "/dashboard/chats",
      icon: MessageCircle,
    },
    {
      label: "Active Agents",
      value: activeAgents,
      description: "Active team members",
      actionLabel: "View agents",
      href: "/dashboard/agents",
      icon: TrendingUp,
    },
  ];

  return (
    <main className="px-5 py-8 sm:px-8">
      <section className="rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-sm sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">
          Welcome back, {session.user.name}
        </p>

        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Manage every enquiry from one platform.
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Track leads, view conversations, assign agents and control
          your website chatbot.
        </p>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {card.label}
                  </p>

                  <p className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                {card.description}
              </p>

              <Link
                href={card.href}
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
              >
                {card.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Recent leads
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest enquiries received across your lead sources.
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

        {recentLeads.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Users className="h-6 w-6" />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              No leads received yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              New enquiries will appear here.
            </p>
          </div>
        ) : (
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
                {recentLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {lead.name ?? "Unknown lead"}
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
                      {lead.createdAt.toLocaleDateString("en-GB")}
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
        )}
      </section>
    </main>
  );
}