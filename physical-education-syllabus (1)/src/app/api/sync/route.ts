import { pool } from "@/db";
import { ensureTables, getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser(req);
    if (!user) return Response.json({ ok: false, error: "auth" }, { status: 401 });
    const a = await pool.query(
      "SELECT id,title,mode,paper,score,total,detail,created_at FROM attempts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
      [user.id],
    );
    const s = await pool.query("SELECT data FROM user_state WHERE user_id=$1", [user.id]);
    return Response.json({ ok: true, attempts: a.rows, state: s.rows[0]?.data ?? null });
  } catch (e) {
    console.error("sync get", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTables();
    const user = await getSessionUser(req);
    if (!user) return Response.json({ ok: false, error: "auth" }, { status: 401 });
    let body: {
      attempt?: { title?: unknown; mode?: unknown; paper?: unknown; score?: unknown; total?: unknown; detail?: unknown };
      state?: unknown;
    } = {};
    try {
      body = await req.json();
    } catch {
      return Response.json({ ok: false, error: "invalid" }, { status: 400 });
    }
    if (body.attempt && typeof body.attempt === "object") {
      const a = body.attempt;
      await pool.query(
        "INSERT INTO attempts (user_id,title,mode,paper,score,total,detail) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [
          user.id,
          String(a.title ?? "Session").slice(0, 200),
          String(a.mode ?? "practice").slice(0, 30),
          Number(a.paper) === 2 ? 2 : 1,
          Math.max(0, Math.floor(Number(a.score) || 0)),
          Math.max(0, Math.floor(Number(a.total) || 0)),
          JSON.stringify(a.detail ?? null),
        ],
      );
    }
    if (body.state && typeof body.state === "object") {
      const json = JSON.stringify(body.state);
      if (json.length < 1_500_000) {
        await pool.query(
          `INSERT INTO user_state (user_id,data,updated_at) VALUES ($1,$2::jsonb,NOW())
           ON CONFLICT (user_id) DO UPDATE SET data=$2::jsonb, updated_at=NOW()`,
          [user.id, json],
        );
      }
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("sync post", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
