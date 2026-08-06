import { redirect } from "next/navigation";
import DashboardNotifications from "./DashboardNotifications";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import DashboardSidebar from "./DashboardSidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const company = session.user.companyId
    ? await prisma.company.findUnique({
        where: {
          id: session.user.companyId,
        },
        select: {
          name: true,
        },
      })
    : null;

  const companyName = company?.name ?? "WhatsApp Enquiry";

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardSidebar companyName={companyName} />

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 pl-16 sm:px-8 sm:pl-20 lg:pl-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                WhatsApp Enquiry Platform
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Manage leads and customer conversations
              </p>
            </div>

            <div className="flex items-center gap-4">
                <DashboardNotifications />

              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-slate-900">
                  {session.user.name}
                </p>

                <p className="text-xs text-slate-500">
                  {session.user.role.replaceAll("_", " ")}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {session.user.name?.charAt(0).toUpperCase() ?? "A"}
              </div>

              <form
                action={async () => {
                  "use server";

                  await signOut({
                    redirectTo: "/login",
                  });
                }}
              >
                <button
                  type="submit"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}