import { db, hasDatabase } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase) return Response.json({ ok: true, db: false });
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: true });
  } catch {
    // the app itself (practice, PYQs, AI, flashcards) does not depend on the database
    return Response.json({ ok: true, db: false });
  }
}
