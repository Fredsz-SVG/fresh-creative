import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
const PHOTO_GROUP_MODEL = "flux-kontext-apps/multi-image-list";

function getOutputUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object" && "url" in output) {
    const u = (output as { url?: (() => string) | string }).url;
    return typeof u === "function" ? u() : typeof u === "string" ? u : "";
  }
  return "";
}

export const POST = async (req: NextRequest) => {
  try {
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "REPLICATE_API_TOKEN tidak dikonfigurasi" },
        { status: 500 }
      );
    }

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });
    const form = await req.formData();
    const subjects = form.getAll("subjects") as File[];
    const prompt = (form.get("prompt") as string)?.trim() || "";
    const aspectRatio = (form.get("aspect_ratio") as string) || "match_input_image";
    const outputFormat = (form.get("output_format") as string) || "png";
    const safetyTolerance = Math.min(Math.max(parseInt((form.get("safety_tolerance") as string) || "2", 10) || 2, 0), 2);
    const seed = form.get("seed") ? parseInt(form.get("seed") as string, 10) : undefined;

    if (subjects.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Minimal upload 2 gambar untuk digabung" },
        { status: 400 }
      );
    }
    if (subjects.length > 10) {
      return NextResponse.json(
        { ok: false, error: "Maksimal 10 gambar per grup" },
        { status: 400 }
      );
    }
    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt wajib diisi! Deskripsikan bagaimana gambar-gambar akan digabung menjadi 1 foto grup." },
        { status: 400 }
      );
    }

    for (let i = 0; i < subjects.length; i++) {
      if (!(subjects[i] instanceof File)) {
        return NextResponse.json(
          { ok: false, error: `File gambar ${i + 1} tidak valid` },
          { status: 400 }
        );
      }
    }

    const inputImages: string[] = [];
    for (const subject of subjects) {
      const buffer = Buffer.from(await subject.arrayBuffer());
      inputImages.push(`data:image/jpeg;base64,${buffer.toString("base64")}`);
    }

    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      input_images: inputImages,
      output_format: outputFormat,
      safety_tolerance: safetyTolerance,
    };
    if (seed !== undefined && !Number.isNaN(seed)) input.seed = seed;

    const output = await replicate.run(PHOTO_GROUP_MODEL, { input });
    const result = getOutputUrl(output);

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Tidak ada hasil yang dihasilkan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number; response?: { status?: number; data?: { detail?: string } } };
    const message = e?.message || String(err);
    const detail = e?.response?.data?.detail || message;
    const statusCode = e?.status ?? e?.response?.status;
    const lower = (detail + " " + message).toLowerCase();
    const is402 = statusCode === 402 || lower.includes("insufficient credit") || lower.includes("402") || lower.includes("payment required");

    console.error("Photo Group API error:", { message, detail, statusCode, is402, full: err });

    if (is402) {
      return NextResponse.json(
        {
          ok: false,
          error: `❌ Replicate: Saldo kredit habis atau belum diisi.\n\nReplicate memakai prepaid credit. Isi saldo di: https://replicate.com/account/billing\n\nDetail: ${detail || message}`,
        },
        { status: 402 }
      );
    }

    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
      return NextResponse.json(
        { ok: false, error: detail || message },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { ok: false, error: message || "Gagal memproses photo group" },
      { status: 500 }
    );
  }
};
