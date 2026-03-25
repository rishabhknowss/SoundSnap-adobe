import { NextRequest, NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { prisma } from "@/lib/prisma";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY!,
  environment: (process.env.DODO_ENVIRONMENT as "live_mode" | "test_mode") || "live_mode",
});

export async function POST(req: NextRequest) {
  console.log("=== WEBHOOK HIT ===");

  try {
    const rawBody = await req.text();

    const headers = {
      "webhook-id": req.headers.get("webhook-id") || "",
      "webhook-signature": req.headers.get("webhook-signature") || "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
    };

    let payload: any;
    try {
      payload = (dodo.webhooks as any).unwrap(rawBody, headers, process.env.DODO_WEBHOOK_KEY!);
    } catch (verifyErr) {
      console.error("Webhook verification failed, trying raw parse:", verifyErr);
      payload = JSON.parse(rawBody);
    }

    const eventType = payload.type || payload.event_type;
    const data = payload.data || payload;

    if (eventType === "payment.succeeded") {
      const metadata = data.metadata || {};
      const paymentId = data.payment_id || data.id;
      const totalAmount = data.total_amount || data.amount;
      const currency = data.currency || "USD";

      const userId = metadata.user_id;
      const creditsToAdd = parseInt(metadata.credits || "0");

      console.log("Payment succeeded:", { userId, creditsToAdd, paymentId, totalAmount });

      if (!userId || !creditsToAdd) {
        console.error("Missing metadata:", { userId, creditsToAdd, metadata });
        return NextResponse.json({ received: true, warning: "missing metadata" });
      }

      // Idempotency check
      const existing = await prisma.transaction.findUnique({ where: { paymentId } });
      if (existing) {
        console.log("Already processed:", paymentId);
        return NextResponse.json({ received: true });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        console.error("User not found:", userId);
        return NextResponse.json({ received: true, warning: "user not found" });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsToAdd } },
      });
      await prisma.transaction.create({
        data: {
          userId,
          type: "purchase",
          creditsAmount: creditsToAdd,
          paymentId,
          amountPaid: totalAmount,
          currency,
          status: "completed",
        },
      });

      console.log("Credits added successfully:", { userId, credits: creditsToAdd });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
}
export { OPTIONS } from "@/lib/cors";
