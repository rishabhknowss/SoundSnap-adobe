import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, name: string | null, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: "SoundSnap <onboarding@resend.dev>",
    to: email,
    subject: "Verify your email - SoundSnap",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:40px 20px;">
        <h1 style="color:#18181b;font-size:24px;margin-bottom:8px;">SoundSnap</h1>
        <p style="color:#333;font-size:16px;line-height:1.5;">Hi ${name || "there"},</p>
        <p style="color:#333;font-size:16px;line-height:1.5;">Click below to verify your email and activate your account.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}" style="background:#7c3aed;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">Verify Email</a>
        </div>
        <p style="color:#999;font-size:13px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}
