import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCredits, estimateFromDuration, MIN_CREDITS_REQUIRED, PRICE_PER_SECOND_USD } from "@/lib/credits";
export { OPTIONS } from "@/lib/cors";

fal.config({ credentials: process.env.FAL_API_KEY! });

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req.headers);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const { videoUrl, prompt, videoDuration } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
    }

    // Step 1: Estimate cost from video duration
    const duration = videoDuration || 10; // fallback 10s if not provided
    const { estimatedCredits, estimatedCompute } = estimateFromDuration(duration);
    const requiredCredits = Math.max(MIN_CREDITS_REQUIRED, estimatedCredits);

    console.log(`Video: ${duration}s | Est compute: ${estimatedCompute}s | Est credits: ${estimatedCredits} | User has: ${user.credits}`);

    // Step 2: Check user has enough credits for estimated cost
    if (user.credits < requiredCredits) {
      return NextResponse.json({
        error: `Insufficient credits. This ${Math.round(duration)}s video needs ~${estimatedCredits} credits. You have ${user.credits}.`,
        code: "INSUFFICIENT_CREDITS",
        credits: user.credits,
        estimatedCredits,
        videoDuration: duration,
      }, { status: 402 });
    }

    // Step 3: Generate audio
    console.log("Generating audio with ThinkSound...");

    let computeStart: number | null = null;

    const result = await fal.subscribe("fal-ai/thinksound" as any, {
      input: {
        video_url: videoUrl,
        prompt: prompt || "Generate ambient background sound that fits the video's content",
        num_inference_steps: 24,
        cfg_scale: 5,
      } as any,
      logs: true,
      timeout: 180000,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && !computeStart) {
          computeStart = Date.now();
          console.log("Compute started");
        }
        if (update.status === "IN_PROGRESS") {
          console.log("Generation progress:", update.logs?.map((l) => l.message));
        }
      },
    });

    const computeEnd = Date.now();
    const computeSeconds = computeStart
      ? (computeEnd - computeStart) / 1000
      : estimatedCompute; // fallback to estimate

    const generatedVideoUrl = (result.data as any)?.video?.url;

    if (!generatedVideoUrl) {
      console.error("No video URL in result:", JSON.stringify(result.data).substring(0, 500));
      throw new Error("No video generated");
    }

    // Step 4: Calculate actual cost and deduct
    const creditsToDeduct = calculateCredits(computeSeconds);
    const costUsd = computeSeconds * PRICE_PER_SECOND_USD;
    const actualDeduction = Math.min(creditsToDeduct, user.credits);

    console.log(`Actual compute: ${computeSeconds.toFixed(1)}s | Cost: $${costUsd.toFixed(4)} | Credits: ${actualDeduction}`);

    const updatedUser = await prisma.user.update({
      where: { id: user.id, credits: { gte: actualDeduction } },
      data: { credits: { decrement: actualDeduction } },
    });

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        creditsUsed: actualDeduction,
        computeSeconds: Math.round(computeSeconds * 10) / 10,
        costUsd: Math.round(costUsd * 10000) / 10000,
        sourceType: "video",
        videoUrl,
        outputUrl: generatedVideoUrl,
        prompt: prompt?.substring(0, 500) || "auto-generated",
        status: "success",
      },
    });

    return NextResponse.json({
      generatedVideoUrl,
      creditsRemaining: updatedUser.credits,
      creditsUsed: actualDeduction,
      computeSeconds: Math.round(computeSeconds * 10) / 10,
    });
  } catch (err: any) {
    console.error("Generation error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to generate audio" }, { status: 500 });
  }
}
