import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCredits, PRICE_PER_SECOND_USD } from "@/lib/credits";
export { OPTIONS } from "@/lib/cors";

fal.config({ credentials: process.env.FAL_API_KEY! });

// GET: Poll generation status
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req.headers);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  try {
    // Find the usage log
    const log = await prisma.usageLog.findFirst({
      where: { id: jobId, userId: user.id },
    });

    if (!log) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Already completed
    if (log.status === "success") {
      return NextResponse.json({
        status: "success",
        generatedVideoUrl: log.outputUrl,
        creditsUsed: log.creditsUsed,
        creditsRemaining: user.credits,
      });
    }

    // Already failed
    if (log.status === "failed") {
      return NextResponse.json({ status: "failed", error: "Generation failed" });
    }

    // Check fal queue status
    if (!log.falRequestId) {
      return NextResponse.json({ status: "failed", error: "No fal request ID" });
    }

    const queueStatus = await fal.queue.status("fal-ai/thinksound" as any, {
      requestId: log.falRequestId,
      logs: true,
    });

    console.log(`Job ${jobId} fal status: ${queueStatus.status}`);

    if (queueStatus.status === "IN_QUEUE") {
      return NextResponse.json({ status: "queued" });
    }

    if (queueStatus.status === "IN_PROGRESS") {
      return NextResponse.json({ status: "processing" });
    }

    if (queueStatus.status === "COMPLETED") {
      // Fetch the result
      const result = await fal.queue.result("fal-ai/thinksound" as any, {
        requestId: log.falRequestId,
      });

      const generatedVideoUrl = (result.data as any)?.video?.url;

      if (!generatedVideoUrl) {
        await prisma.usageLog.update({ where: { id: jobId }, data: { status: "failed" } });
        return NextResponse.json({ status: "failed", error: "No video generated" });
      }

      // Calculate cost from fal response or estimate
      // Use time between job creation and now as compute estimate
      const computeSeconds = (Date.now() - log.createdAt.getTime()) / 1000;
      const creditsToDeduct = calculateCredits(computeSeconds);
      const costUsd = computeSeconds * PRICE_PER_SECOND_USD;
      const actualDeduction = Math.min(creditsToDeduct, user.credits);

      console.log(`Job done | Compute: ~${computeSeconds.toFixed(0)}s | Credits: ${actualDeduction}`);

      // Deduct credits
      const updatedUser = await prisma.user.update({
        where: { id: user.id, credits: { gte: actualDeduction } },
        data: { credits: { decrement: actualDeduction } },
      });

      // Update usage log
      await prisma.usageLog.update({
        where: { id: jobId },
        data: {
          status: "success",
          outputUrl: generatedVideoUrl,
          creditsUsed: actualDeduction,
          computeSeconds: Math.round(computeSeconds * 10) / 10,
          costUsd: Math.round(costUsd * 10000) / 10000,
        },
      });

      return NextResponse.json({
        status: "success",
        generatedVideoUrl,
        creditsUsed: actualDeduction,
        creditsRemaining: updatedUser.credits,
      });
    }

    // Unknown status
    return NextResponse.json({ status: "processing" });
  } catch (err: any) {
    console.error("Status check error:", err.message);
    return NextResponse.json({ status: "processing" }); // Don't fail, let client retry
  }
}
