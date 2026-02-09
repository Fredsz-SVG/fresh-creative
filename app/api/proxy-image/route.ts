import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy gambar eksternal agar bisa dipakai di canvas (hindari CORS).
 * Hanya mengizinkan URL dari domain yang diizinkan (Replicate, dll).
 */
function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return (
      u.hostname === "replicate.delivery" ||
      u.hostname.endsWith(".replicate.delivery") ||
      u.hostname === "replicate.com"
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json({ error: "Invalid or disallowed URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FreshCreative/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("proxy-image error:", e);
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}
