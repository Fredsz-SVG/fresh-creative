// app/api/video/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const image = form.get("image") as File;

  if (!(image instanceof File)) return NextResponse.json({ ok: false, error: "File tidak valid" }, { status: 400 });

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "REPLICATE_PHOTO2VIDEO_MODEL_VERSION",
      input: { image: image.name }
    }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
