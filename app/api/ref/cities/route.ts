import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const province_id = String(url.searchParams.get("province_id") ?? "").trim();
    if (!province_id) {
      return NextResponse.json(
        { ok: false, error: "province_id is required" },
        { status: 400 }
      );
    }

    const qRaw = String(url.searchParams.get("q") ?? "").trim().toLowerCase();
    const kind = String(url.searchParams.get("kind") ?? "").trim().toLowerCase(); // optional: "kota" | "kabupaten"
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "100") || 100, 300);

    // normalize: kalau user ngetik "kota semarang" / "kab semarang", tetap jadi "semarang"
    const q = qRaw
      .replace(/^kota\s+/, "")
      .replace(/^kabupaten\s+/, "")
      .replace(/^kab\s+/, "")
      .trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRole);

    let query = supabase
      .from("ref_cities")
      .select("id, province_id, name, kind")
      .eq("province_id", province_id);

    if (kind === "kota" || kind === "kabupaten") {
      query = query.eq("kind", kind);
    }

    if (q) {
      // biar "semarang" match:
      // - "Semarang" (kabupaten)
      // - "Kota Semarang" (kota)
      const p1 = `${q}%`;
      const p2 = `kota ${q}%`;
      const p3 = `kabupaten ${q}%`;
      const p4 = `kab ${q}%`;

      query = query.or(
        `name_lower.ilike.${p1},name_lower.ilike.${p2},name_lower.ilike.${p3},name_lower.ilike.${p4}`
      );
    }

    const { data, error } = await query.order("name").limit(limit);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
