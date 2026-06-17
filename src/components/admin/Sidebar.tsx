"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const NAV_LINKS = [
  { href: "/", label: "Overview", icon: "📊" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/live", label: "Live map", icon: "🗺️" },
  { href: "/dispatch", label: "Dispatch", icon: "🧭" },
  { href: "/couriers", label: "Couriers", icon: "🛵" },
  { href: "/orders", label: "Order ledger", icon: "🧾" },
  { href: "/vendors", label: "Inventory", icon: "🏪" },
  { href: "/surge", label: "Surge", icon: "⚡" },
  { href: "/escrow", label: "Escrow", icon: "🔒" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-white"
                : "text-muted hover:bg-border/50 hover:text-text"
            )}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
