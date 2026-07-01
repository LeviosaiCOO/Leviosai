// DB keepalive — prevents Supabase free-tier idle auto-pause.
//
// Supabase pauses a free project after ~7 days without activity. A paused
// project stops resolving in DNS and drops its pooler tenant, which surfaces
// as "tenant/user not found" or login failures — not an app bug, but it looks
// like one. Running a tiny `SELECT 1` on an interval keeps the project marked
// active so it never pauses.
//
// This lives in-process because the Railway web service is always on; it does
// not depend on any external cron or third-party pinger. Tune or disable via
// env: DB_KEEPALIVE_MS (default 4h) and DB_KEEPALIVE_DISABLED=true.

import { pool } from "./db.js";

const DEFAULT_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours — well under the ~7-day pause window

let timer: NodeJS.Timeout | null = null;

export function startDbKeepalive() {
  if (process.env.DB_KEEPALIVE_DISABLED === "true") {
    console.log("⏸️  DB keepalive disabled via DB_KEEPALIVE_DISABLED");
    return;
  }
  if (timer) return; // already running

  const interval = parseInt(process.env.DB_KEEPALIVE_MS || "") || DEFAULT_INTERVAL_MS;

  const ping = async () => {
    try {
      await pool.query("SELECT 1");
      console.log(`💓 DB keepalive ping ok (${new Date().toISOString()})`);
    } catch (err: any) {
      // Don't crash — just log. If the DB is genuinely down this will retry
      // on the next tick once it recovers.
      console.warn("⚠️  DB keepalive ping failed:", err.message);
    }
  };

  timer = setInterval(ping, interval);
  // Node keeps the event loop alive for setInterval; unref so it never blocks
  // a graceful shutdown.
  timer.unref?.();
  console.log(`💓 DB keepalive started — pinging every ${Math.round(interval / 60000)} min to prevent Supabase idle-pause`);
}

export function stopDbKeepalive() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
