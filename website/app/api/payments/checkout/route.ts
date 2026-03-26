import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CREDIT_PACKS } from "@/lib/credits";

const DODO_API_URL = process.env.DODO_ENVIRONMENT === "test_mode"
  ? "https://test.dodopayments.com"
  : "https://api.dodopayments.com";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req.headers);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { packId } = await req.json();
    const pack = CREDIT_PACKS.find((p) => p.id === packId);

    if (!pack) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }
    if (!pack.productId) {
      return NextResponse.json({ error: "Payment product not configured" }, { status: 500 });
    }

    const body: any = {
      billing: {
        city: "NA",
        country: "US",
        state: "NA",
        street: "NA",
        zipcode: "00000",
      },
      customer: {
        email: user.email,
        name: user.name || user.email,
      },
      product_cart: [{ product_id: pack.productId, quantity: 1 }],
      payment_link: true,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      metadata: {
        user_id: user.id,
        pack_id: pack.id,
        credits: String(pack.credits),
      },
    };

    if (user.dodoCustId) {
      body.customer = { customer_id: user.dodoCustId };
    }

    const res = await fetch(`${DODO_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DODO_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Dodo payment error:", data);
      console.error("Dodo debug:", { url: `${DODO_API_URL}/payments`, env: process.env.DODO_ENVIRONMENT, productId: pack.productId, keyPrefix: process.env.DODO_API_KEY?.substring(0, 10) });
      return NextResponse.json({ error: data.message || "Payment creation failed" }, { status: 500 });
    }

    if (data.customer?.customer_id && !user.dodoCustId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { dodoCustId: data.customer.customer_id },
      });
    }

    return NextResponse.json({ paymentLink: data.payment_link, paymentId: data.payment_id });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
export { OPTIONS } from "@/lib/cors";
