import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.emailVerified) {
      return NextResponse.json({ message: "If an account exists, a verification email has been sent." });
    }

    const verificationToken = uuid();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationExpires },
    });

    await sendVerificationEmail(email, user.name, verificationToken);
    return NextResponse.json({ message: "Verification email sent. Please check your inbox." });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Failed to resend verification email" }, { status: 500 });
  }
}
export { OPTIONS } from "@/lib/cors";
