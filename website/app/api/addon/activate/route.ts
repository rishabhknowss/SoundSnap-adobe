import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, userResponse } from "@/lib/auth";
export { OPTIONS } from "@/lib/cors";

export async function POST(req: NextRequest) {
  try {
    const { key, adobeId } = await req.json();

    if (!key) {
      return NextResponse.json({ error: "Activation key is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { activationKey: key.trim().toUpperCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid activation key" }, { status: 404 });
    }

    if (adobeId && !user.adobeId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { adobeId },
      });
    }

    const token = createToken(user);
    return NextResponse.json({ token, user: userResponse(user) });
  } catch (err) {
    console.error("Activation error:", err);
    return NextResponse.json({ error: "Activation failed" }, { status: 500 });
  }
}
