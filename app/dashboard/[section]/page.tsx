import { notFound } from "next/navigation";

const sections: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  leads: {
    title: "Leads",
    description:
      "View, filter, assign and manage customer enquiries.",
  },
  conversations: {
    title: "WhatsApp Conversations",
    description:
      "Manage bot and agent conversations from one inbox.",
  },
  agents: {
    title: "Agents",
    description:
      "Add team members and assign leads or conversations.",
  },
  programmes: {
    title: "Programmes",
    description:
      "Manage courses and services shown by the chatbot.",
  },
  widget: {
    title: "Website Widget",
    description:
      "Customize and embed the WhatsApp widget on websites.",
  },
  settings: {
    title: "Settings",
    description:
      "Manage company details, WhatsApp configuration and bot settings.",
  },
};

type DashboardSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function DashboardSectionPage({
  params,
}: DashboardSectionPageProps) {
  const { section } = await params;
  const currentSection = sections[section];

  if (!currentSection) {
    notFound();
  }

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
          WhatsApp CRM
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          {currentSection.title}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
          {currentSection.description}
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="font-semibold text-slate-800">
            This module will be added next.
          </p>
        </div>
      </div>
    </main>
  );
}