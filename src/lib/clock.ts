import "server-only";
import { cookies } from "next/headers";

/*
  Demo clock: lets the team force the "night surge" (>= 19:00) during a demo
  without waiting for evening. If the `dd_demo_hour` cookie is set (0-23) we
  override the hour on today's date; otherwise we use the real time.
*/
export const DEMO_HOUR_COOKIE = "dd_demo_hour";

export async function getNow(): Promise<Date> {
  const jar = await cookies();
  const raw = jar.get(DEMO_HOUR_COOKIE)?.value;
  if (raw == null) return new Date();
  const hour = Number(raw);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return new Date();
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}
