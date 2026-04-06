import { NextResponse } from "next/server";
import { FonnteClient } from "fonnte-wa";
import { apiUrl } from "@/lib/api-url";

type NotifyPayload = {
  schoolName?: string;
  whatsapp?: string;
  contactName?: string;
};

function sanitize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isWhatsappFormat(value: string): boolean {
  return /^\+?[0-9\s-]{9,20}$/.test(value);
}

function normalizeWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as NotifyPayload;
    const schoolName = sanitize(body.schoolName);
    const whatsapp = sanitize(body.whatsapp);
    const contactName = sanitize(body.contactName);
    const normalizedWhatsapp = normalizeWhatsapp(whatsapp);

    if (!schoolName || !whatsapp || !contactName) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    if (!isWhatsappFormat(whatsapp) || !/^[0-9]{9,20}$/.test(normalizedWhatsapp)) {
      return NextResponse.json({ ok: false, error: "invalid_whatsapp" }, { status: 400 });
    }

    const apiKey = process.env.FONNTE_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ ok: true, sent: false, reason: "not_configured" });
    }

    // Fetch Fonnte target from Hono D1 endpoint
    let target = "";
    try {
      const configRes = await fetch(apiUrl("/api/landing/config"));
      if (configRes.ok) {
        const config = (await configRes.json().catch(() => ({}))) as { target?: string };
        target = config.target?.trim() || "";
      }
    } catch {
      // fallback: use env var if endpoint fails
      target = process.env.FONNTE_TARGET?.trim() || "";
    }

    if (!target) {
      return NextResponse.json({ ok: true, sent: false, reason: "not_configured" });
    }

    const client = new FonnteClient({ apiKey });
    const now = new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    });

    const message = [
      "[Lead Baru - Landing Pricing Cetak Fisik]",
      `Waktu: ${now}`,
      `Sekolah/Organisasi: ${schoolName}`,
      `No. WhatsApp: ${normalizedWhatsapp}`,
      `Nama: ${contactName}`,
    ].join("\n");

    const response = await client.sendMessage({
      target,
      message,
    });

    return NextResponse.json({ ok: true, sent: Boolean(response?.status) });
  } catch {
    return NextResponse.json({ ok: true, sent: false, reason: "send_failed" });
  }
}
