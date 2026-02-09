import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
// Sesuai template Replicate: wan-video/wan-2.2-i2v-fast
const PHOTO_TO_VIDEO_MODEL = "wan-video/wan-2.2-i2v-fast";

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
    const photo = form.get("photo") as File | null;
    const prompt = (form.get("prompt") as string)?.trim() || "A cinematic video with smooth motion and natural movement";

    if (!(photo instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "File foto tidak valid" },
        { status: 400 }
      );
    }

    const photoBuffer = Buffer.from(await photo.arrayBuffer());
    const imageDataUrl = `data:image/jpeg;base64,${photoBuffer.toString("base64")}`;

    const input = {
      image: imageDataUrl,
      prompt,
      go_fast: true,
      num_frames: 81,
      resolution: "480p",
      sample_shift: 12,
      frames_per_second: 16,
      interpolate_output: false,
      lora_scale_transformer: 1,
      lora_scale_transformer_2: 1,
    };

    const output = await replicate.run(PHOTO_TO_VIDEO_MODEL, { input });
    const videoUrl = getOutputUrl(output);

    if (!videoUrl) {
      return NextResponse.json(
        { ok: false, error: "Tidak ada hasil video yang dihasilkan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, video: videoUrl });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number; response?: { status?: number; data?: { detail?: string } } };
    const message = e?.message || String(err);
    const detail = e?.response?.data?.detail || message;
    const statusCode = e?.status ?? e?.response?.status;
    const lower = (detail + " " + message).toLowerCase();
    const is402 = statusCode === 402 || lower.includes("insufficient credit") || lower.includes("402") || lower.includes("payment required");

    console.error("Photo to Video API error:", { message, detail, statusCode, is402, full: err });

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
      { ok: false, error: message || "Gagal memproses photo to video" },
      { status: 500 }
    );
  }
};
