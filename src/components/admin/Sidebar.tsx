"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Overview", icon: "📊" },
  { href: "/couriers", label: "Couriers", icon: "🛵" },
  { href: "/orders", label: "Order ledger", icon: "🧾" },
  { href: "/vendors", label: "Inventory", icon: "🏪" },
  { href: "/escrow", label: "Escrow", icon: "🔒" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((l) => {
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
