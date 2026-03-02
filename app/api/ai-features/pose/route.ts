import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@/lib/supabase-server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
// Sesuai template Replicate: sdxl-based/consistent-character
const POSE_MODEL = "sdxl-based/consistent-character";
const POSE_VERSION = "9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772";

function getOutputUrls(output: unknown): string[] {
  if (!Array.isArray(output) || output.length === 0) return [];
  return output.map((item: unknown) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "url" in item) {
      const u = (item as { url?: (() => string) | string }).url;
      return typeof u === "function" ? u() : typeof u === "string" ? u : "";
    }
    return "";
  }).filter(Boolean);
}

export const POST = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: pricing, error: pricingError } = await supabase
      .from("ai_feature_pricing")
      .select("credits_per_use")
      .eq("feature_slug", "pose")
      .maybeSingle();

    if (pricingError) {
      return NextResponse.json({ ok: false, error: pricingError.message }, { status: 500 });
    }

    const creditsPerUse = pricing?.credits_per_use ?? 0;
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (userError) {
      return NextResponse.json({ ok: false, error: userError.message }, { status: 500 });
    }

    const currentCredits = userRow?.credits ?? 0;

    if (creditsPerUse > 0 && currentCredits < creditsPerUse) {
      return NextResponse.json(
        {
          ok: false,
          error: "Credit kamu tidak cukup untuk generate Pose. Silakan top up credit terlebih dahulu.",
        },
        { status: 402 }
      );
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "REPLICATE_API_TOKEN tidak dikonfigurasi" },
        { status: 500 }
      );
    }

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });
    const form = await req.formData();

    const subject = form.get("subject") as File | null;
    const prompt = (form.get("prompt") as string)?.trim() || "A headshot photo";
    const negativePrompt = (form.get("negative_prompt") as string)?.trim() || "";
    let numberOfOutputs = parseInt((form.get("number_of_outputs") as string) || "3");
    const numberOfImagesPerPose = Math.min(Math.max(parseInt((form.get("number_of_images_per_pose") as string) || "1"), 1), 4);
    const randomisePoses = form.get("randomise_poses") !== "false";
    const outputFormat = (form.get("output_format") as string) || "webp";
    const outputQuality = Math.min(Math.max(parseInt((form.get("output_quality") as string) || "80"), 0), 100);
    const seed = form.get("seed") ? parseInt(form.get("seed") as string) : undefined;

    numberOfOutputs = Math.min(Math.max(numberOfOutputs, 1), 3); // max 3

    if (!(subject instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "File foto karakter (subject) wajib diupload" },
        { status: 400 }
      );
    }

    const subjectBuffer = Buffer.from(await subject.arrayBuffer());
    const subjectDataUrl = `data:image/jpeg;base64,${subjectBuffer.toString("base64")}`;

    const input: Record<string, unknown> = {
      prompt,
      subject: subjectDataUrl,
      output_format: outputFormat,
      output_quality: outputQuality,
      negative_prompt: negativePrompt,
      randomise_poses: randomisePoses,
      number_of_outputs: numberOfOutputs,
      number_of_images_per_pose: numberOfImagesPerPose,
    };
    if (seed !== undefined) input.seed = seed;

    const output = await replicate.run(`${POSE_MODEL}:${POSE_VERSION}`, { input });
    const results = getOutputUrls(output);

    if (results.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Tidak ada hasil yang dihasilkan" },
        { status: 500 }
      );
    }

    if (creditsPerUse > 0) {
      const { data: latestUser, error: updateFetchError } = await supabase
        .from("users")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (!updateFetchError) {
        const latestCredits = latestUser?.credits ?? 0;
        const newCredits = latestCredits >= creditsPerUse ? latestCredits - creditsPerUse : 0;
        await supabase
          .from("users")
          .update({ credits: newCredits })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number; response?: { status?: number; data?: { detail?: string } } };
    const message = e?.message || String(err);
    const detail = e?.response?.data?.detail || message;
    const statusCode = e?.status ?? e?.response?.status;
    const lower = (detail + " " + message).toLowerCase();
    const is402 = statusCode === 402 || lower.includes("insufficient credit") || lower.includes("402") || lower.includes("payment required");

    console.error("Pose API error:", { message, detail, statusCode, is402, full: err });

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
      { ok: false, error: message || "Gagal memproses pose" },
      { status: 500 }
    );
  }
};
