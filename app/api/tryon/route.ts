import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
// cuuupid/idm-vton — best-in-class virtual try-on in the wild (non-commercial)
// https://replicate.com/cuuupid/idm-vton
const IDM_VTON_MODEL = "cuuupid/idm-vton";
const IDM_VTON_VERSION = "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985";

function getOutputUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object" && "url" in output && typeof (output as { url: unknown }).url === "function") {
    return (output as { url: () => string }).url();
  }
  if (output && typeof output === "object" && "url" in output && typeof (output as { url: string }).url === "string") {
    return (output as { url: string }).url;
  }
  throw new Error("Invalid try-on output");
}

async function processSingleGarment(
  replicate: Replicate,
  humanImageBase64: string,
  garmentImageBase64: string,
  garmentDes: string = "",
  category: string = "upper_body",
  steps: number = 30,
  crop: boolean = false,
  seed: number = 42,
  forceDc: boolean = false,
  maskOnly: boolean = false
): Promise<string> {
  const output = await replicate.run(`${IDM_VTON_MODEL}:${IDM_VTON_VERSION}`, {
    input: {
      human_img: humanImageBase64,
      garm_img: garmentImageBase64,
      garment_des: garmentDes,
      category,
      steps,
      crop,
      seed,
      force_dc: forceDc,
      mask_only: maskOnly,
    },
  });
  return getOutputUrl(output);
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

    const human = form.get("human_img");
    const garm = form.get("garm_img");
    const mode = (form.get("mode") as string) || "single";

    if (!(human instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "File manusia tidak valid" },
        { status: 400 }
      );
    }

    const humanBuffer = Buffer.from(await human.arrayBuffer());
    const humanBase64 = "data:image/jpeg;base64," + humanBuffer.toString("base64");

    if (garm instanceof File) {
      const garmBuffer = Buffer.from(await garm.arrayBuffer());
      const garmBase64 = "data:image/jpeg;base64," + garmBuffer.toString("base64");
      const garmentDes = (form.get("garment_des") as string) || "";
      const category = (form.get("category") as string) || "upper_body";
      const steps = Math.min(Math.max(parseInt((form.get("steps") as string) || "30") || 30, 1), 40);
      const crop = form.get("crop") === "true";
      const seed = form.get("seed") ? parseInt(form.get("seed") as string) : undefined;
      const forceDc = form.get("force_dc") === "true";
      const maskOnly = form.get("mask_only") === "true";

      const result = await processSingleGarment(
        replicate,
        humanBase64,
        garmBase64,
        garmentDes,
        category,
        steps,
        crop,
        seed ?? 42,
        forceDc,
        maskOnly
      );
      return NextResponse.json({ ok: true, results: [result] });
    }

    const garments: File[] = [];
    const garmentEntries = form.getAll("garments");
    for (const entry of garmentEntries) {
      if (entry instanceof File) garments.push(entry);
    }

    if (garments.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Minimal 1 garment diperlukan" },
        { status: 400 }
      );
    }

    if (garments.length > 2) {
      return NextResponse.json(
        { ok: false, error: "Maksimal 2 garments per generate" },
        { status: 400 }
      );
    }

    const results: string[] = [];

    if (mode === "chain") {
      let currentHumanImage = humanBase64;
      let finalResult: string | null = null;

      for (let i = 0; i < garments.length; i++) {
        const garmBuffer = Buffer.from(await garments[i].arrayBuffer());
        const garmBase64 = "data:image/jpeg;base64," + garmBuffer.toString("base64");
        const category = (form.get(`category_${i}`) as string) || "upper_body";
        const steps = Math.min(Math.max(parseInt((form.get("steps") as string) || "30") || 30, 1), 40);
        const crop = form.get("crop") === "true";
        const seed = form.get("seed") ? parseInt(form.get("seed") as string) : undefined;
        const forceDc = form.get("force_dc") === "true";
        const maskOnly = form.get("mask_only") === "true";

        const result = await processSingleGarment(
          replicate,
          currentHumanImage,
          garmBase64,
          `Garment ${i + 1}`,
          category,
          steps,
          crop,
          seed ?? 42,
          forceDc,
          maskOnly
        );
        finalResult = result;

        if (i < garments.length - 1) {
          const res = await fetch(result);
          const buf = Buffer.from(await res.arrayBuffer());
          currentHumanImage = "data:image/jpeg;base64," + buf.toString("base64");
        }
      }

      if (finalResult) results.push(finalResult);
    } else {
      const steps = Math.min(Math.max(parseInt((form.get("steps") as string) || "30") || 30, 1), 40);
      const crop = form.get("crop") === "true";
      const seed = form.get("seed") ? parseInt(form.get("seed") as string) : undefined;
      const forceDc = form.get("force_dc") === "true";
      const maskOnly = form.get("mask_only") === "true";

      const promises = garments.map(async (garment, index) => {
        const garmBuffer = Buffer.from(await garment.arrayBuffer());
        const garmBase64 = "data:image/jpeg;base64," + garmBuffer.toString("base64");
        const category = (form.get(`category_${index}`) as string) || "upper_body";
        return processSingleGarment(
          replicate,
          humanBase64,
          garmBase64,
          `Garment ${index + 1}`,
          category,
          steps,
          crop,
          seed ?? 42,
          forceDc,
          maskOnly
        );
      });
      results.push(...(await Promise.all(promises)));
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number; response?: { status?: number; data?: { detail?: string } } };
    const message = e?.message || String(err);
    const detail = e?.response?.data?.detail || message;
    const statusCode = e?.status ?? e?.response?.status;
    const lower = (detail + " " + message).toLowerCase();
    const is402 = statusCode === 402 || lower.includes("insufficient credit") || lower.includes("402") || lower.includes("payment required");

    console.error("Try-on API error:", { message, detail, statusCode, is402, full: err });

    if (is402) {
      return NextResponse.json(
        {
          ok: false,
          error: `❌ Replicate: Saldo kredit habis atau belum diisi.\n\nReplicate memakai prepaid credit (bukan hanya kartu terdaftar). Anda harus isi saldo dulu:\n1. Buka https://replicate.com/account/billing\n2. Klik "Add credit" / isi saldo (prepaid)\n3. Tunggu 1–2 menit lalu coba lagi.\n\nDetail dari server: ${detail || message}`,
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
      { ok: false, error: message || "Gagal memproses try-on" },
      { status: 500 }
    );
  }
};
