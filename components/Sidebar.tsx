"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Users, Mail, BarChart2, TrendingUp, Settings, Home } from "lucide-react";
import clsx from "clsx";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Properties", href: "/properties", icon: Search },
  { label: "My Lists", href: "/leads", icon: Users },
  { label: "Comps", href: "/comps", icon: TrendingUp },
  { label: "Marketing", href: "/marketing", icon: Mail },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-full w-60 bg-slate-900 text-white flex flex-col z-50">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Home className="text-blue-400" size={22} />
          <span className="text-xl font-bold text-white">
            Deal<span className="text-blue-400">Hunter</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Settings size={18} />
          Settings
        </Link>
        <div className="mt-3 px-3 py-2 bg-slate-800 rounded-lg">
          <p className="text-xs text-slate-400">Logged in as</p>
          <p className="text-sm font-medium text-white">caleb@wursten.co</p>
        </div>
      </div>
    </aside>
  );
}
