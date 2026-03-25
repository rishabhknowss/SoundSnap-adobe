import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export { OPTIONS } from "@/lib/cors";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req.headers);
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const logs = await prisma.usageLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ generations: logs });
}
