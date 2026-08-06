import { redirect } from "next/navigation";
import {
  MessageCircle,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    return (
      <main className="p-5 sm:p-8">
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
      description: "All customer enquiries",
      icon: Users,
    },
    {
      label: "New Leads",
      value: newLeads,
      description: "Waiting for follow-up",
      icon: UserPlus,
    },
    {
      label: "Active Conversations",
      value: activeConversations,
      description: "Bot and agent conversations",
      icon: MessageCircle,
    },
    {
      label: "Active Agents",
      value: activeAgents,
      description: "Available team members",
      icon: TrendingUp,
    },
  ];

  return (
    <main className="px-5 py-8 sm:px-8">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-10">
        <p className="text-sm font-semibold text-emerald-400">
          Welcome back, {session.user.name}
        </p>

        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Manage every WhatsApp enquiry from one platform.
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
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
            </article>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Recent leads
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest WhatsApp enquiries received
            </p>
          </div>
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
              New website and WhatsApp enquiries will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Customer
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
                </tr>
              </thead>

              <tbody>
                {recentLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-100 last:border-0"
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
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {lead.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {lead.createdAt.toLocaleDateString("en-GB")}
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