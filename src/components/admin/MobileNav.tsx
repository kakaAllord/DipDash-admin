"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/Brand";
import { NAV_LINKS } from "@/components/admin/Sidebar";
import { logoutAdmin } from "@/app/login-actions";

/**
 * Mobile/tablet top bar with a slide-down menu. Shown below `md`, where the
 * desktop sidebar is hidden, so the admin is fully navigable on phones.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={24} height={24} className="rounded-md" />
          <Wordmark />
          <span className="rounded bg-text px-1.5 py-0.5 text-[10px] font-bold text-white">
            ADMIN
          </span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-xl"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-3 py-3">
          {NAV_LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
          <form action={logoutAdmin} className="mt-1">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-border/50"
            >
              Sign out
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
