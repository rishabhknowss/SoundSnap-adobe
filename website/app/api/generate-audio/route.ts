import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateFromDuration, MIN_CREDITS_REQUIRED } from "@/lib/credits";
export { OPTIONS } from "@/lib/cors";

fal.config({ credentials: process.env.FAL_API_KEY! });

// POST: Submit generation to fal queue, return job ID immediately
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req.headers);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const { videoUrl, prompt, videoDuration } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
    }

    // Estimate cost and pre-check credits
    const duration = videoDuration || 10;
    const { estimatedCredits } = estimateFromDuration(duration);
    const requiredCredits = Math.max(MIN_CREDITS_REQUIRED, estimatedCredits);

    if (user.credits < requiredCredits) {
      return NextResponse.json({
        error: `Insufficient credits. This ${Math.round(duration)}s video needs ~${estimatedCredits} credits. You have ${user.credits}.`,
        code: "INSUFFICIENT_CREDITS",
        credits: user.credits,
        estimatedCredits,
      }, { status: 402 });
    }

    // Submit to fal queue (non-blocking)
    console.log(`Submitting to fal queue | Video: ${duration}s | Est credits: ${estimatedCredits}`);

    const { request_id } = await fal.queue.submit("fal-ai/thinksound" as any, {
      input: {
        video_url: videoUrl,
        prompt: prompt || "Generate ambient background sound that fits the video's content",
        num_inference_steps: 24,
        cfg_scale: 5,
      } as any,
    });

    console.log(`Fal job submitted: ${request_id}`);

    // Create usage log with "processing" status
    const log = await prisma.usageLog.create({
      data: {
        userId: user.id,
        falRequestId: request_id,
        sourceType: "video",
        videoUrl,
        prompt: prompt?.substring(0, 500) || "auto-generated",
        status: "processing",
      },
    });

    return NextResponse.json({
      jobId: log.id,
      falRequestId: request_id,
      estimatedCredits,
      status: "processing",
    });
  } catch (err: any) {
    console.error("Generation submit error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to start generation" }, { status: 500 });
  }
}
