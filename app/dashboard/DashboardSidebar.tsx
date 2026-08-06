"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Bot,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Settings,
  Users,
  X,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Leads",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    name: "Live Chats",
    href: "/dashboard/chats",
    icon: MessageCircle,
  },
  {
    name: "Agents",
    href: "/dashboard/agents",
    icon: Users,
  },
  {
    name: "Programmes",
    href: "/dashboard/programmes",
    icon: BookOpen,
  },
  {
    name: "Website Widget",
    href: "/dashboard/widget",
    icon: Bot,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

type DashboardSidebarProps = {
  companyName: string;
};

export default function DashboardSidebar({
  companyName,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <>
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-bold text-white">
            E
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {companyName}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Enquiry CRM
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() =>
                setMobileOpen(false)
              }
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-950/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />

              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-2xl bg-slate-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Bot status
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

            <p className="text-sm font-semibold text-white">
              Active
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-slate-950 lg:flex">
        {sidebarContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            onClick={() =>
              setMobileOpen(false)
            }
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close navigation"
          />

          <aside className="relative flex h-full w-72 flex-col bg-slate-950 shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setMobileOpen(false)
              }
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>

            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}