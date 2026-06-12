import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export async function getStudentByAdmission(admissionNo: string) {
  const rows = await db
    .select()
    .from(schema.students)
    .where(eq(schema.students.admissionNo, admissionNo.trim()))
    .limit(1);
  return rows[0] ?? null;
}

export async function getStudentById(studentId: string) {
  const rows = await db
    .select()
    .from(schema.students)
    .where(eq(schema.students.id, studentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCourierByStudent(studentId: string) {
  const rows = await db
    .select()
    .from(schema.couriers)
    .where(eq(schema.couriers.studentId, studentId))
    .limit(1);
  return rows[0] ?? null;
}
