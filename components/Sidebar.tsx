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
      {/* Hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg text-white shadow-lg"
        style={{ background: "#2d2825" }}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Panel */}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-60 flex flex-col z-50",
          "transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ background: "#2d2825" }}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid #3d3530" }}>
          <div className="flex items-center gap-2.5">
            {/* W monogram */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "#492b23" }}
            >
              W
            </div>
            <div className="leading-tight">
              <span className="text-white font-bold text-base tracking-tight">Wursten</span>
              <span className="font-light text-base tracking-tight" style={{ color: "#9e948c" }}> Deals</span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden" style={{ color: "#9e948c" }}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                )}
                style={{
                  background: active ? "#492b23" : "transparent",
                  color: active ? "#fff" : "#9e948c",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#3d3530"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9e948c"; }}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: "1px solid #3d3530" }}>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: "#9e948c" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#3d3530"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9e948c"; }}
          >
            <Settings size={17} />
            Settings
          </Link>
          <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: "#3d3530" }}>
            <p className="text-xs" style={{ color: "#5d544c" }}>Logged in as</p>
            <p className="text-sm font-medium text-white truncate">caleb@wursten.co</p>
          </div>
        </div>
      </aside>
    </>
  );
}
