import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/auth";
import { generateActivationKey } from "@/lib/activation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(`${APP_URL}/?error=oauth_failed`);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/auth/callback/google`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${APP_URL}/?error=oauth_failed`);
    }

    const { access_token } = await tokenRes.json();
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { id: googleId, email, name, picture } = await profileRes.json();

    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), name, avatarUrl: picture, googleId, emailVerified: true, activationKey: generateActivationKey() },
      update: { googleId, name, avatarUrl: picture, emailVerified: true },
    });

    const token = createToken(user);
    return NextResponse.redirect(`${APP_URL}/dashboard?token=${token}`);
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(`${APP_URL}/?error=oauth_failed`);
  }
}
export { OPTIONS } from "@/lib/cors";
