"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { getAdminByUsername } from "@/lib/repo/admin";
import { createSession, clearSession } from "@/lib/auth/session";

const schemaIn = z.object({
  username: z.string().trim().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export async function loginAdmin(
  _prev: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const parsed = schemaIn.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const admin = await getAdminByUsername(parsed.data.username);
  if (!admin || !bcrypt.compareSync(parsed.data.password, admin.passwordHash)) {
    return { ok: false, error: "Invalid username or password" };
  }
  await createSession({ kind: "admin", sub: admin.id, name: admin.username });
  return { ok: true };
}

export async function logoutAdmin() {
  await clearSession("admin");
  redirect("/login");
}
