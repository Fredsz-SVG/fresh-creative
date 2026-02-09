import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qRaw = (url.searchParams.get("q") ?? "").trim().toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRole);

    let query = supabase
      .from("ref_provinces")
      .select("id,name")
      .order("name", { ascending: true })
      .limit(100);

    if (qRaw) query = query.ilike("name_lower", `%${qRaw}%`);

    const { data, error } = await query;
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
