import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, userResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const adobeId = req.nextUrl.searchParams.get("adobeId");

  if (!adobeId) {
    return NextResponse.json({ linked: false, error: "adobeId required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { adobeId },
  });

  if (!user) {
    return NextResponse.json({ linked: false });
  }

  const token = createToken(user);
  return NextResponse.json({ linked: true, token, user: userResponse(user) });
}
export { OPTIONS } from "@/lib/cors";
