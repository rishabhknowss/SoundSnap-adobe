import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { generateActivationKey } from "@/lib/activation";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      if (existing.googleId) {
        return NextResponse.json({ error: "This email is linked to a Google account. Please sign in with Google.", code: "GOOGLE_ACCOUNT" }, { status: 409 });
      }
      return NextResponse.json({ error: "An account with this email already exists", code: "EMAIL_EXISTS" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = uuid();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        passwordHash,
        emailVerified: false,
        verificationToken,
        verificationExpires,
        activationKey: generateActivationKey(),
      },
    });

    await sendVerificationEmail(email, name, verificationToken);

    return NextResponse.json({ message: "Account created. Please check your email to verify your account." }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
export { OPTIONS } from "@/lib/cors";
