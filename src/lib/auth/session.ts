import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/*
  Lightweight signed-cookie sessions, one cookie per surface so a single person
  can be logged into the student app and the courier app at the same time.
*/

export type SessionKind = "student" | "courier" | "admin";

const COOKIE: Record<SessionKind, string> = {
  student: "dd_student",
  courier: "dd_courier",
  admin: "dd_admin",
};

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me"
);

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  kind: SessionKind;
  /** Primary subject id: studentId | courierId | adminId. */
  sub: string;
  name?: string;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ name: payload.name, kind: payload.kind })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE[payload.kind], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(
  kind: SessionKind
): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE[kind])?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      kind,
      sub: payload.sub as string,
      name: payload.name as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function clearSession(kind: SessionKind): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE[kind]);
}
