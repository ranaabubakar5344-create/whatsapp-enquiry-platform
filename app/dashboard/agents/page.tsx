import { redirect } from "next/navigation";
import {
  MessageCircle,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AgentActions from "./AgentActions";
import AgentForm from "./AgentForm";

export default async function AgentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-bold text-amber-900">
            Company not assigned
          </h1>

          <p className="mt-2 text-sm text-amber-700">
            This account is not connected to a company.
          </p>
        </div>
      </main>
    );
  }

  const canManageAgents =
    session.user.role === "COMPANY_ADMIN" ||
    session.user.role === "SUPER_ADMIN";

const agents = await prisma.user.findMany({
  where: {
    companyId,
    role: "AGENT",
  },
  orderBy: {
    createdAt: "desc",
  },
  select: {
    id: true,
    name: true,
    email: true,
    isActive: true,
    createdAt: true,
  },
});

  const activeAgents = agents.filter(
    (agent) => agent.isActive
  ).length;

  return (
    <main className="px-5 py-8 sm:px-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Team Management
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Agents
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage team members who handle leads and conversations.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Agents
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {agents.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Active
            </p>

            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {activeAgents}
            </p>
          </div>
        </div>
      </section>

      {canManageAgents ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Add new agent
              </h2>

              <p className="text-sm text-slate-500">
                Create a login account for a team member.
              </p>
            </div>
          </div>

          <AgentForm />
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">
            Only company administrators can create or manage agents.
          </p>
        </section>
      )}

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-950">
            Team members
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Agents currently connected to this company.
          </p>
        </div>

        {agents.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Users className="h-6 w-6" />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              No agents available
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Create the first agent using the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Agent
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assigned Leads
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Conversations
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Created
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {agent.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {agent.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                          agent.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            agent.isActive
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                        />

                        {agent.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
0
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <MessageCircle className="h-4 w-4 text-slate-400" />
0
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {agent.createdAt.toLocaleDateString("en-GB")}
                    </td>

                    <td className="px-6 py-4">
                      {canManageAgents ? (
                        <AgentActions
                          agentId={agent.id}
                          isActive={agent.isActive}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">
                          No permission
                        </span>
                      )}
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