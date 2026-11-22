import { hasDatabase, pool } from "@/db";
import { createSession, destroySession, ensureTables, getSessionUser, hashPassword, verifyPassword } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ action: string }> };

const bad = (error: string, status = 400) => Response.json({ ok: false, error }, { status });

export async function GET(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  if (action !== "me") return bad("Not found", 404);
  const user = hasDatabase ? await getSessionUser(req) : null;
  return Response.json({ ok: true, user, accounts: hasDatabase });
}

export async function POST(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  if (!hasDatabase) {
    return bad("Accounts are turned off on this deployment (no database configured). You can keep practising as a guest — your progress is saved in this browser.", 503);
  }
  try {
    await ensureTables();
  } catch {
    return bad("The database is not reachable right now. Please try again in a moment.", 503);
  }

  try {
    if (action === "logout") {
      await destroySession(req);
      return Response.json({ ok: true });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return bad("Invalid request");
    }
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    const password = String(body.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Please enter a valid email address.");
    if (password.length < 6 || password.length > 100) return bad("Password must be at least 6 characters.");

    if (action === "signup") {
      const name = String(body.name ?? "").trim().slice(0, 60) || email.split("@")[0];
      const exists = await pool.query("SELECT 1 FROM users WHERE email=$1", [email]);
      if (exists.rowCount) return bad("An account with this email already exists. Try signing in.", 409);
      const ins = await pool.query(
        "INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id,name,email",
        [name, email, hashPassword(password)],
      );
      const user = ins.rows[0];
      const token = await createSession(user.id);
      return Response.json({ ok: true, user, token });
    }

    if (action === "login") {
      const r = await pool.query("SELECT id,name,email,password_hash FROM users WHERE email=$1", [email]);
      const row = r.rows[0];
      if (!row) return bad("No account found for this email. Please sign up first.", 401);
      if (!verifyPassword(password, row.password_hash)) return bad("Incorrect password. Please try again.", 401);
      const token = await createSession(row.id);
      return Response.json({ ok: true, user: { id: row.id, name: row.name, email: row.email }, token });
    }

    return bad("Not found", 404);
  } catch (e) {
    console.error("auth error", e);
    return bad("Server error. Please try again.", 500);
  }
}
