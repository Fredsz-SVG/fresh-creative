import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

// ✅ CEO LOCK: 7 mandatory events allowlist
const ALLOWED_EVENTS = new Set([
  "lead_started",
  "lead_submitted",
  "estimator_viewed",
  "estimator_calculated",
  "contact_sales_clicked",
  "proposal_requested",
  "sales_notified",
]);

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { ok: false, error: message, ...(code ? { code } : {}) },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const event_name = String(body?.event_name ?? "").trim();
    if (!event_name) {
      return jsonError("event_name is required", 400, "MISSING_EVENT_NAME");
    }

    // ✅ allowlist guard
    if (!ALLOWED_EVENTS.has(event_name)) {
      return jsonError(
        `event_name '${event_name}' is not allowed`,
        400,
        "EVENT_NOT_ALLOWED"
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return jsonError("Missing SUPABASE env vars", 500, "MISSING_ENV_VARS");
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    const user_agent = req.headers.get("user-agent") ?? "";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      (req.headers.get("x-real-ip") ?? null);

    const ip_hash = ip ? sha256(ip) : null;
    const ua_hash = user_agent ? sha256(user_agent) : null;

    const payload = {
      event_name,
      path: body?.path ?? null,
      user_id: body?.user_id ?? null,
      anon_id: body?.anon_id ?? null,
      ip_hash,
      ua_hash,
      props: body?.props ?? {},
    };

    const { error } = await supabase.from("events").insert(payload);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, code: "DB_INSERT_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown error", code: "UNHANDLED" },
      { status: 500 }
    );
  }
}
