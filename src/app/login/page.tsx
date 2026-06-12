"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, type LoginResult } from "../login-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo, Wordmark } from "@/components/Brand";

export default function AdminLogin() {
  const router = useRouter();
  const [state, action, pending] = useActionState<LoginResult | null, FormData>(
    loginAdmin,
    null
  );

  useEffect(() => {
    if (state?.ok) router.replace("/");
  }, [state, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <div className="flex items-center gap-1.5">
            <Wordmark className="text-2xl" />
            <span className="rounded-md bg-text px-2 py-0.5 text-xs font-bold text-white">
              ADMIN
            </span>
          </div>
          <p className="text-sm text-muted">Command Center</p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <Input name="username" label="Username" placeholder="admin" required />
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            required
          />
          {state?.error && (
            <p className="text-sm font-medium text-danger">{state.error}</p>
          )}
          <Button type="submit" size="lg" block disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
