import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getAuthUser } from "@/lib/auth";
export { OPTIONS } from "@/lib/cors";

fal.config({ credentials: process.env.FAL_API_KEY! });

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req.headers);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("video") as File;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Supported: MP4, MOV, WebM" }, { status: 400 });
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
    }

    console.log("Uploading video to Fal storage...", file.name, file.size);

    // Upload to Fal storage with retry
    let videoUrl: string;
    try {
      videoUrl = await fal.storage.upload(file);
    } catch {
      console.log("First upload attempt failed, retrying...");
      videoUrl = await fal.storage.upload(file);
    }

    console.log("Video uploaded:", videoUrl);

    return NextResponse.json({ videoUrl });
  } catch (err: any) {
    console.error("Upload error:", err.message);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
