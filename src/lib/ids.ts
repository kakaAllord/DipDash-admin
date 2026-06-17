import { randomBytes, randomInt } from "crypto";

/** URL-safe-ish unique id with a type prefix, e.g. "ord_a1b2c3d4e5". */
export function id(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

/** N-digit numeric string, zero-padded (e.g. OTP / handoff PIN). */
export function numericCode(digits = 6): string {
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, "0");
}

/** Short pickup token shown at the vendor counter, e.g. "PK-7321". */
export function pickupToken(): string {
  return `PK-${numericCode(4)}`;
}
