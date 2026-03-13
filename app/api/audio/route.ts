import { NextResponse } from "next/server";
import { readdirSync } from "fs";
import { join } from "path";

const AUDIO_EXT = [".mp3", ".m4a", ".ogg", ".wav"];

export async function GET() {
  try {
    const audioDir = join(process.cwd(), "public", "audio");
    const names = readdirSync(audioDir, { withFileTypes: true })
      .filter((f) => f.isFile() && AUDIO_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)))
      .map((f) => f.name)
      .sort();
    const files = names.map((name) => `/audio/${name}`);
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
