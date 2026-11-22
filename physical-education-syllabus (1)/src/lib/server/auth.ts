import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { hasDatabase, pool } from "@/db";

let ready: Promise<void> | null = null;

/** Creates tables if they do not exist, so a fresh database works without a manual migration. */
export function ensureTables(): Promise<void> {
  if (!hasDatabase) return Promise.reject(new Error("NO_DATABASE"));
  if (!ready) {
    ready = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at TIMESTAMP NOT NULL
        );
        CREATE TABLE IF NOT EXISTS attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          mode TEXT NOT NULL,
          paper INTEGER NOT NULL,
          score INTEGER NOT NULL,
          total INTEGER NOT NULL,
          detail JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS user_state (
          user_id INTEGER PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = String(stored || "").split(":");
    if (!salt || !hash) return false;
    const test = scryptSync(password, salt, 64);
    const orig = Buffer.from(hash, "hex");
    return orig.length === test.length && timingSafeEqual(orig, test);
  } catch {
    return false;
  }
}

export const COOKIE = "sayon_sid";
const DAYS = 90;

/** Creates a session and returns its token. The token is also set as a cookie, but the client keeps it
 *  in localStorage too so that sign-in keeps working when third-party cookies are blocked (embedded previews). */
export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DAYS * 86400000);
  await pool.query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1,$2,$3)", [token, userId, expires]);
  try {
    const jar = await cookies();
    jar.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires,
    });
  } catch {
    /* cookies may be unavailable – the bearer token still works */
  }
  return token;
}

export async function destroySession(req?: Request) {
  const token = tokenFrom(req);
  if (token) await pool.query("DELETE FROM sessions WHERE token=$1", [token]);
  try {
    const jar = await cookies();
    if (jar.get(COOKIE)) jar.delete(COOKIE);
  } catch {
    /* ignore */
  }
}

function bearer(req?: Request): string | undefined {
  if (!req) return undefined;
  const h = req.headers.get("authorization") ?? "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim() || undefined;
  return undefined;
}

/** token sent by the client (cookie or Authorization header) */
export function tokenFrom(req?: Request): string | undefined {
  return bearer(req);
}

export async function readCookieToken(): Promise<string | undefined> {
  try {
    const jar = await cookies();
    return jar.get(COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export type SessionUser = { id: number; name: string; email: string };

export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
  try {
    await ensureTables();
  } catch {
    return null;
  }
  const token = bearer(req) ?? (await readCookieToken());
  if (!token) return null;
  try {
    const r = await pool.query(
      `WITH touched AS (
         UPDATE sessions SET expires_at = NOW() + ($2 || ' days')::interval
         WHERE token=$1 AND expires_at > NOW() RETURNING user_id
       )
       SELECT u.id, u.name, u.email FROM touched t JOIN users u ON u.id = t.user_id`,
      [token, DAYS],
    );
    return r.rows[0] ?? null;
  } catch {
    return null;
  }
}

/** convenience for server components */
export async function getUser(): Promise<SessionUser | null> {
  return getSessionUser();
}
