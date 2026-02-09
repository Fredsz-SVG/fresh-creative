// scripts/seed_ref_cities.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing env. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const API_BASE = "https://api-regional-indonesia.vercel.app/api";

function normalize(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return res.json();
}

async function main() {
  console.log("1) Load provinces from your DB...");
  const { data: dbProvs, error: dbProvErr } = await supabase
    .from("ref_provinces")
    .select("id,name,name_lower");

  if (dbProvErr) throw dbProvErr;
  if (!dbProvs?.length) throw new Error("ref_provinces is empty. Seed provinces first.");

  const byNameLower = new Map(dbProvs.map((p) => [normalize(p.name_lower ?? p.name), p]));

  console.log("2) Fetch provinces from API...");
  const provJson = await fetchJson(`${API_BASE}/provinces?sort=name`);
  if (!provJson?.status || !Array.isArray(provJson.data)) {
    throw new Error("API provinces response unexpected");
  }

  // Map: apiProvinceId (e.g. "11") -> ourProvinceId (e.g. "ID-AC")
  const apiToOur = new Map();

  for (const ap of provJson.data) {
    const key = normalize(ap.name);
    const match = byNameLower.get(key);
    if (!match) {
      console.warn("⚠️ No match for province name:", ap.name);
      continue;
    }
    apiToOur.set(String(ap.id), String(match.id));
  }

  console.log("3) Seed cities/regencies into ref_cities (upsert by id)...");
  let totalUpsert = 0;

  for (const [apiProvId, ourProvId] of apiToOur.entries()) {
    const citiesJson = await fetchJson(`${API_BASE}/cities/${apiProvId}?sort=name`);
    if (!citiesJson?.status || !Array.isArray(citiesJson.data)) {
      console.warn("⚠️ skip province", apiProvId, "bad cities response");
      continue;
    }

    const rows = citiesJson.data.map((c) => {
      const name = String(c.name ?? "");
      const kind = name.toLowerCase().startsWith("kota ") ? "kota" : "kabupaten";
      return {
        id: String(c.id),
        province_id: ourProvId,
        name,
        kind,
      };
    });

    // Upsert in chunks (biar aman)
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("ref_cities")
        .upsert(chunk, { onConflict: "id" });

      if (error) throw error;
      totalUpsert += chunk.length;
    }

    console.log(`- ${ourProvId} <= ${rows.length} rows`);
    await sleep(120); // tiny throttle biar API ga rewel
  }

  console.log("✅ Done. Total upserted:", totalUpsert);
  console.log("Now check Supabase Table Editor > ref_cities, filter by province_id (e.g. ID-JT).");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e?.message ?? e);
  process.exit(1);
});
