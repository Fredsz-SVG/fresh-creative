import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Guard cuma untuk /pricing (dan turunan /pricing/* kalau nanti ada)
  if (pathname === "/pricing" || pathname.startsWith("/pricing/")) {
    const leadId = req.cookies.get("lead_id")?.value;

    // Kalau belum ada lead_id, lempar balik ke showroom
    if (!leadId) {
      const url = req.nextUrl.clone();
      url.pathname = "/showroom";
      url.searchParams.set("gate", "lead_required");
      url.searchParams.set("from", pathname); // optional (biar bisa balik otomatis)
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pricing/:path*"],
};
