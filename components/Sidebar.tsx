"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Search, Users, Mail, BarChart2,
  TrendingUp, Settings, Menu, X,
} from "lucide-react";
import clsx from "clsx";

const nav = [
  { label: "Dashboard",  href: "/",           icon: LayoutDashboard },
  { label: "Properties", href: "/properties",  icon: Search },
  { label: "My Lists",   href: "/leads",       icon: Users },
  { label: "Comps",      href: "/comps",       icon: TrendingUp },
  { label: "Marketing",  href: "/marketing",   icon: Mail },
  { label: "Analytics",  href: "/analytics",   icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg text-white shadow-lg"
        style={{ background: "#111111" }}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-60 flex flex-col z-50",
          "transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ background: "#111111" }}
      >
        {/* Logo */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#000000" }}
            >
              <span
                className="text-white font-black leading-none select-none"
                style={{ fontSize: "22px", fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.5px" }}
              >
                W
              </span>
            </div>
            <div className="leading-tight">
              <p className="text-white font-semibold text-sm tracking-wide">Wursten</p>
              <p className="text-xs font-light tracking-widest uppercase" style={{ color: "#888888" }}>Deals</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden" style={{ color: "#888888" }}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? "#000000" : "transparent",
                  color: active ? "#fff" : "#888888",
                }}
                onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}}
                onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#888888"; }}}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4" style={{ borderTop: "1px solid #1e1e1e" }}>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: "#888888" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#888888"; }}
          >
            <Settings size={17} />
            Settings
          </Link>
          <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: "#1e1e1e" }}>
            <p className="text-xs" style={{ color: "#555555" }}>Logged in as</p>
            <p className="text-sm font-medium text-white truncate">caleb@wursten.co</p>
          </div>
        </div>
      </aside>
    </>
  );
}
