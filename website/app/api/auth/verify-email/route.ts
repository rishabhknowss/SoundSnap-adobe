import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_token`);
  }

  const user = await prisma.user.findFirst({ where: { verificationToken: token } });

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_token`);
  }

  if (user.verificationExpires && new Date() > user.verificationExpires) {
    return NextResponse.redirect(`${APP_URL}/?error=token_expired`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null, verificationExpires: null },
  });

  return NextResponse.redirect(`${APP_URL}/?verified=true`);
}
export { OPTIONS } from "@/lib/cors";
