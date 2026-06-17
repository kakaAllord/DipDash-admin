import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/admin/Sidebar";
import { MobileNav } from "@/components/admin/MobileNav";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { logoutAdmin } from "../login-actions";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("admin");
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
          <Wordmark />
          <span className="rounded bg-text px-1.5 py-0.5 text-[10px] font-bold text-white">
            ADMIN
          </span>
        </div>
        <Sidebar />
        <form action={logoutAdmin} className="mt-auto">
          <Button type="submit" variant="ghost" block size="sm">
            Sign out
          </Button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="flex-1 px-4 py-5 sm:px-5 md:px-8 md:py-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
